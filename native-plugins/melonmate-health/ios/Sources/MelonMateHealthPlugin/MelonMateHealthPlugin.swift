import Capacitor
import Foundation
import HealthKit

@objc(MelonMateHealthPlugin)
public final class MelonMateHealthPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "MelonMateHealthPlugin"
    public let jsName = "MelonMateHealth"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestActivityAuthorization", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "readDailyActivity", returnType: CAPPluginReturnPromise)
    ]

    private let healthStore = HKHealthStore()

    @objc public func isAvailable(_ call: CAPPluginCall) {
        call.resolve(["available": HKHealthStore.isHealthDataAvailable()])
    }

    @objc public func requestActivityAuthorization(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.resolve(["authorized": false])
            return
        }

        var readTypes = Set<HKObjectType>()
        if let steps = HKObjectType.quantityType(forIdentifier: .stepCount) {
            readTypes.insert(steps)
        }
        if let standTime = HKObjectType.quantityType(forIdentifier: .appleStandTime) {
            readTypes.insert(standTime)
        }
        readTypes.insert(HKObjectType.workoutType())

        healthStore.requestAuthorization(toShare: [], read: readTypes) { success, error in
            DispatchQueue.main.async {
                if let error {
                    call.reject("Health authorization failed", nil, error)
                } else {
                    // HealthKit intentionally does not reveal whether read access was denied.
                    // A successful request means the permission sheet was processed; denied
                    // types simply return no samples from the read query.
                    call.resolve(["authorized": success])
                }
            }
        }
    }

    @objc public func readDailyActivity(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.reject("HealthKit is unavailable", "HEALTH_UNAVAILABLE")
            return
        }
        guard let rawDate = call.getString("date"), let interval = dayInterval(rawDate) else {
            call.reject("Use a date in YYYY-MM-DD format", "BAD_DATE")
            return
        }
        guard
            let stepType = HKObjectType.quantityType(forIdentifier: .stepCount),
            let standType = HKObjectType.quantityType(forIdentifier: .appleStandTime)
        else {
            call.reject("Required HealthKit activity types are unavailable", "TYPE_UNAVAILABLE")
            return
        }

        let group = DispatchGroup()
        var steps = 0.0
        var standMinutes = 0.0
        var workouts: [HKWorkout] = []
        var stepQueryError: Error?
        var standQueryError: Error?
        var workoutQueryError: Error?
        let resultLock = NSLock()

        group.enter()
        sum(type: stepType, unit: .count(), interval: interval) { value, error in
            resultLock.lock()
            steps = value
            stepQueryError = error
            resultLock.unlock()
            group.leave()
        }

        group.enter()
        sum(type: standType, unit: .minute(), interval: interval) { value, error in
            resultLock.lock()
            standMinutes = value
            standQueryError = error
            resultLock.unlock()
            group.leave()
        }

        group.enter()
        readWorkouts(interval: interval) { value, error in
            resultLock.lock()
            workouts = value
            workoutQueryError = error
            resultLock.unlock()
            group.leave()
        }

        group.notify(queue: .main) {
            if let stepQueryError {
                call.reject("Step count query failed", "STEP_QUERY_FAILED", stepQueryError)
                return
            }
            // A watch-less device or restricted Apple Stand Time permission
            // should not prevent the independently available step count from syncing.
            if let standQueryError {
                NSLog("MelonMateHealth: Apple Stand Time query failed: %@", standQueryError.localizedDescription)
            }
            if let workoutQueryError {
                NSLog("MelonMateHealth: workout query failed: %@", workoutQueryError.localizedDescription)
            }
            call.resolve([
                "steps": max(0, Int(steps.rounded(.down))),
                "standMinutes": standQueryError == nil ? max(0, Int(standMinutes.rounded(.down))) : 0,
                "workouts": workoutQueryError == nil ? workouts.map(self.serializeWorkout) : []
            ])
        }
    }

    private func dayInterval(_ rawDate: String) -> DateInterval? {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = .current
        formatter.dateFormat = "yyyy-MM-dd"
        guard let start = formatter.date(from: rawDate) else { return nil }
        return Calendar.current.dateInterval(of: .day, for: start)
    }

    private func sum(
        type: HKQuantityType,
        unit: HKUnit,
        interval: DateInterval,
        completion: @escaping (Double, Error?) -> Void
    ) {
        let predicate = HKQuery.predicateForSamples(
            withStart: interval.start,
            end: interval.end,
            options: [.strictStartDate, .strictEndDate]
        )
        let query = HKStatisticsQuery(
            quantityType: type,
            quantitySamplePredicate: predicate,
            options: .cumulativeSum
        ) { _, statistics, error in
            completion(statistics?.sumQuantity()?.doubleValue(for: unit) ?? 0, error)
        }
        healthStore.execute(query)
    }

    private func readWorkouts(
        interval: DateInterval,
        completion: @escaping ([HKWorkout], Error?) -> Void
    ) {
        let predicate = HKQuery.predicateForSamples(
            withStart: interval.start,
            end: interval.end,
            options: [.strictStartDate, .strictEndDate]
        )
        let query = HKSampleQuery(
            sampleType: HKObjectType.workoutType(),
            predicate: predicate,
            limit: HKObjectQueryNoLimit,
            sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)]
        ) { _, samples, error in
            completion((samples as? [HKWorkout]) ?? [], error)
        }
        healthStore.execute(query)
    }

    private func serializeWorkout(_ workout: HKWorkout) -> [String: Any] {
        [
            "id": workout.uuid.uuidString,
            "activityType": workoutName(workout.workoutActivityType),
            "durationMinutes": max(0, workout.duration / 60),
            "activeCalories": max(0, workout.totalEnergyBurned?.doubleValue(for: .kilocalorie()) ?? 0),
            "startedAt": Int(workout.startDate.timeIntervalSince1970 * 1000)
        ]
    }

    private func workoutName(_ type: HKWorkoutActivityType) -> String {
        switch type {
        case .pilates: return "Pilates"
        case .yoga: return "Yoga"
        case .running: return "Running"
        case .walking: return "Walking"
        case .cycling: return "Cycling"
        case .swimming: return "Swimming"
        case .dance: return "Dance"
        case .functionalStrengthTraining: return "Functional Strength Training"
        case .traditionalStrengthTraining: return "Strength Training"
        case .highIntensityIntervalTraining: return "HIIT"
        case .coreTraining: return "Core Training"
        case .hiking: return "Hiking"
        case .rowing: return "Rowing"
        case .elliptical: return "Elliptical"
        case .stairClimbing: return "Stair Climbing"
        case .flexibility: return "Flexibility"
        case .cooldown: return "Cooldown"
        case .crossTraining: return "Cross Training"
        case .mixedCardio: return "Mixed Cardio"
        default: return "Workout"
        }
    }
}
