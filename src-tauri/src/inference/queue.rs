use serde::{Deserialize, Serialize};
use std::cmp::Ordering;
use std::collections::BinaryHeap;
use std::sync::Arc;
use std::time::Instant;
use tokio::sync::{oneshot, Mutex};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum InferencePriority {
    Abort = 0,
    Autocomplete = 1,
    Chat = 2,
    Background = 3,
}

impl InferencePriority {
    pub fn rank(&self) -> u8 {
        match self {
            InferencePriority::Abort => 0,
            InferencePriority::Autocomplete => 1,
            InferencePriority::Chat => 2,
            InferencePriority::Background => 3,
        }
    }

    pub fn should_preempt(&self, active_priority: InferencePriority) -> bool {
        match self {
            InferencePriority::Abort => true,
            InferencePriority::Autocomplete => {
                active_priority == InferencePriority::Background
                    || active_priority == InferencePriority::Chat
            }
            InferencePriority::Chat => active_priority == InferencePriority::Background,
            InferencePriority::Background => false,
        }
    }
}

#[derive(Debug, Clone)]
pub struct QueuedTask {
    pub id: String,
    pub priority: InferencePriority,
    pub enqueued_at: Instant,
}

impl PartialEq for QueuedTask {
    fn eq(&self, other: &Self) -> bool {
        self.id == other.id
    }
}

impl Eq for QueuedTask {}

impl Ord for QueuedTask {
    fn cmp(&self, other: &Self) -> Ordering {
        // BinaryHeap is a MAX-heap.
        // Lower rank means higher priority, so we compare other with self.
        // If ranks are equal, earlier enqueued_at takes priority.
        other
            .priority
            .rank()
            .cmp(&self.priority.rank())
            .then_with(|| other.enqueued_at.cmp(&self.enqueued_at))
    }
}

impl PartialOrd for QueuedTask {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

pub struct ActiveExecution {
    pub id: String,
    pub priority: InferencePriority,
    pub abort_tx: Option<oneshot::Sender<()>>,
}

#[derive(Clone)]
pub struct InferenceQueue {
    tasks: Arc<Mutex<BinaryHeap<QueuedTask>>>,
    active_execution: Arc<Mutex<Option<ActiveExecution>>>,
}

impl Default for InferenceQueue {
    fn default() -> Self {
        Self::new()
    }
}

impl InferenceQueue {
    pub fn new() -> Self {
        Self {
            tasks: Arc::new(Mutex::new(BinaryHeap::new())),
            active_execution: Arc::new(Mutex::new(None)),
        }
    }

    /// Enqueues a task and returns true if an active lower-priority task was preempted.
    pub async fn enqueue(&self, id: String, priority: InferencePriority) -> bool {
        let mut preempted = false;

        // Check if an active task should be preempted
        {
            let mut active = self.active_execution.lock().await;
            if let Some(ref mut current) = *active {
                if priority.should_preempt(current.priority) {
                    if let Some(tx) = current.abort_tx.take() {
                        let _ = tx.send(());
                        preempted = true;
                    }
                }
            }
        }

        let mut queue = self.tasks.lock().await;
        queue.push(QueuedTask {
            id,
            priority,
            enqueued_at: Instant::now(),
        });

        preempted
    }

    /// Sets the currently active running task with its cancellation sender
    pub async fn set_active(
        &self,
        id: String,
        priority: InferencePriority,
        abort_tx: oneshot::Sender<()>,
    ) {
        let mut active = self.active_execution.lock().await;
        *active = Some(ActiveExecution {
            id,
            priority,
            abort_tx: Some(abort_tx),
        });
    }

    /// Clears the active task if matching the id
    pub async fn clear_active(&self, id: &str) {
        let mut active = self.active_execution.lock().await;
        if let Some(ref current) = *active {
            if current.id == id {
                *active = None;
            }
        }
    }

    /// Gets the priority of the currently active task, if any
    pub async fn active_priority(&self) -> Option<InferencePriority> {
        let active = self.active_execution.lock().await;
        active.as_ref().map(|a| a.priority)
    }

    /// Pops the highest priority task from the queue
    pub async fn pop_next(&self) -> Option<QueuedTask> {
        let mut queue = self.tasks.lock().await;
        queue.pop()
    }

    /// Returns the number of waiting tasks
    pub async fn len(&self) -> usize {
        let queue = self.tasks.lock().await;
        queue.len()
    }

    /// Checks if queue is empty
    pub async fn is_empty(&self) -> bool {
        self.len().await == 0
    }
}

#[cfg(test)]
pub mod tests {
    use super::*;

    #[tokio::test]
    async fn test_priority_ordering() {
        let queue = InferenceQueue::new();

        // Enqueue in arbitrary order
        queue
            .enqueue("bg_1".to_string(), InferencePriority::Background)
            .await;
        queue
            .enqueue("chat_1".to_string(), InferencePriority::Chat)
            .await;
        queue
            .enqueue("auto_1".to_string(), InferencePriority::Autocomplete)
            .await;
        queue
            .enqueue("abort_1".to_string(), InferencePriority::Abort)
            .await;

        assert_eq!(queue.len().await, 4);

        // Expected pop order: Abort -> Autocomplete -> Chat -> Background
        let first = queue.pop_next().await.unwrap();
        assert_eq!(first.id, "abort_1");
        assert_eq!(first.priority, InferencePriority::Abort);

        let second = queue.pop_next().await.unwrap();
        assert_eq!(second.id, "auto_1");
        assert_eq!(second.priority, InferencePriority::Autocomplete);

        let third = queue.pop_next().await.unwrap();
        assert_eq!(third.id, "chat_1");
        assert_eq!(third.priority, InferencePriority::Chat);

        let fourth = queue.pop_next().await.unwrap();
        assert_eq!(fourth.id, "bg_1");
        assert_eq!(fourth.priority, InferencePriority::Background);

        assert!(queue.is_empty().await);
    }

    #[tokio::test]
    async fn test_autocomplete_preempts_background() {
        let queue = InferenceQueue::new();
        let (abort_tx, abort_rx) = oneshot::channel();

        // Simulate active background task
        queue
            .set_active(
                "bg_active".to_string(),
                InferencePriority::Background,
                abort_tx,
            )
            .await;

        // Autocomplete arrives
        let preempted = queue
            .enqueue("auto_hot".to_string(), InferencePriority::Autocomplete)
            .await;

        assert!(preempted, "Autocomplete must preempt background task");

        // Background task receives abort signal
        let signal = abort_rx.await;
        assert!(signal.is_ok(), "Abort signal must be received by background task");
    }

    #[tokio::test]
    async fn test_autocomplete_preempts_chat() {
        let queue = InferenceQueue::new();
        let (abort_tx, abort_rx) = oneshot::channel();

        // Simulate active chat task
        queue
            .set_active("chat_active".to_string(), InferencePriority::Chat, abort_tx)
            .await;

        // Autocomplete arrives
        let preempted = queue
            .enqueue("auto_hot".to_string(), InferencePriority::Autocomplete)
            .await;

        assert!(preempted, "Autocomplete must preempt in-flight chat");
        assert!(abort_rx.await.is_ok());
    }

    #[tokio::test]
    async fn test_background_does_not_preempt_chat() {
        let queue = InferenceQueue::new();
        let (abort_tx, mut abort_rx) = oneshot::channel();

        // Simulate active chat task
        queue
            .set_active("chat_active".to_string(), InferencePriority::Chat, abort_tx)
            .await;

        // Background task arrives
        let preempted = queue
            .enqueue("bg_job".to_string(), InferencePriority::Background)
            .await;

        assert!(!preempted, "Background must NOT preempt active chat");
        assert!(abort_rx.try_recv().is_err());
    }
}
