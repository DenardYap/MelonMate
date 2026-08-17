import ActivityKit
import Capacitor
import Foundation

@objc(MelonMateWorkoutActivityPlugin)
final class MelonMateWorkoutActivityPlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "MelonMateWorkoutActivityPlugin"
    let jsName = "MelonMateWorkoutActivity"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "syncWorkout", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "endWorkout", returnType: CAPPluginReturnPromise)
    ]

    @objc func syncWorkout(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            call.resolve(["supported": false, "active": false])
            return
        }
        guard
            let sessionId = call.getString("sessionId"),
            let workoutName = call.getString("workoutName"),
            let startedAtMilliseconds = call.getDouble("startedAt"),
            let completedSets = call.getInt("completedSets"),
            let totalSets = call.getInt("totalSets")
        else {
            call.reject("Workout activity state is incomplete", "INVALID_WORKOUT")
            return
        }

        let restEndsAt = call.getDouble("restEndsAt").map {
            Date(timeIntervalSince1970: $0 / 1_000)
        }
        let state = WorkoutActivityAttributes.ContentState(
            completedSets: max(0, completedSets),
            totalSets: max(0, totalSets),
            restEndsAt: restEndsAt,
            isResting: restEndsAt != nil,
            language: call.getString("language") == "zh" ? "zh" : "en"
        )
        let content = ActivityContent(
            state: state,
            staleDate: restEndsAt,
            relevanceScore: restEndsAt == nil ? 60 : 90
        )

        Task { @MainActor in
            for activity in Activity<WorkoutActivityAttributes>.activities where activity.attributes.sessionId != sessionId {
                await activity.end(activity.content, dismissalPolicy: .immediate)
            }

            if let activity = Activity<WorkoutActivityAttributes>.activities.first(where: {
                $0.attributes.sessionId == sessionId
            }) {
                await activity.update(content)
                call.resolve(["supported": true, "active": true])
                return
            }

            guard ActivityAuthorizationInfo().areActivitiesEnabled else {
                call.resolve(["supported": true, "active": false])
                return
            }

            do {
                let attributes = WorkoutActivityAttributes(
                    sessionId: sessionId,
                    workoutName: workoutName,
                    startedAt: Date(timeIntervalSince1970: startedAtMilliseconds / 1_000)
                )
                _ = try Activity.request(attributes: attributes, content: content, pushType: nil)
                call.resolve(["supported": true, "active": true])
            } catch {
                call.reject("Workout Live Activity could not start", "LIVE_ACTIVITY_FAILED", error)
            }
        }
    }

    @objc func endWorkout(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            call.resolve(["supported": false])
            return
        }
        guard let sessionId = call.getString("sessionId") else {
            call.reject("Session is required", "INVALID_WORKOUT")
            return
        }

        Task { @MainActor in
            for activity in Activity<WorkoutActivityAttributes>.activities where activity.attributes.sessionId == sessionId {
                await activity.end(activity.content, dismissalPolicy: .immediate)
            }
            call.resolve(["supported": true])
        }
    }
}
