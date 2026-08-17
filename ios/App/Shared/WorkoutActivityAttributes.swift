import ActivityKit
import Foundation

@available(iOS 16.1, *)
struct WorkoutActivityAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        let completedSets: Int
        let totalSets: Int
        let restEndsAt: Date?
        let isResting: Bool
        let language: String
    }

    let sessionId: String
    let workoutName: String
    let startedAt: Date
}
