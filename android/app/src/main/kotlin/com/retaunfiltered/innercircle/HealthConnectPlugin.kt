package com.retaunfiltered.innercircle

import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.aggregate.AggregateMetric
import androidx.health.connect.client.records.ActiveCaloriesBurnedRecord
import androidx.health.connect.client.records.BasalMetabolicRateRecord
import androidx.health.connect.client.records.BodyFatRecord
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.DistanceRecord
import androidx.health.connect.client.records.ElevationGainedRecord
import androidx.health.connect.client.records.FloorsClimbedRecord
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.HeightRecord
import androidx.health.connect.client.records.HydrationRecord
import androidx.health.connect.client.records.HeartRateVariabilityRmssdRecord
import androidx.health.connect.client.records.LeanBodyMassRecord
import androidx.health.connect.client.records.NutritionRecord
import androidx.health.connect.client.records.OxygenSaturationRecord
import androidx.health.connect.client.records.PowerRecord
import androidx.health.connect.client.records.RespiratoryRateRecord
import androidx.health.connect.client.records.RestingHeartRateRecord
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.SpeedRecord
import androidx.health.connect.client.records.StepsCadenceRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.records.TotalCaloriesBurnedRecord
import androidx.health.connect.client.records.Vo2MaxRecord
import androidx.health.connect.client.records.WeightRecord
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter

@CapacitorPlugin(name = "HealthConnect")
class HealthConnectPlugin : Plugin() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var pendingPermissionCall: PluginCall? = null

    private val permissionsByCategory = mapOf(
        "body" to setOf(
            "android.permission.health.READ_WEIGHT",
            "android.permission.health.READ_BODY_FAT",
            "android.permission.health.READ_LEAN_BODY_MASS",
            "android.permission.health.READ_HEIGHT"
        ),
        "activity" to setOf(
            "android.permission.health.READ_STEPS",
            "android.permission.health.READ_ACTIVE_CALORIES_BURNED",
            "android.permission.health.READ_TOTAL_CALORIES_BURNED",
            "android.permission.health.READ_BASAL_METABOLIC_RATE",
            "android.permission.health.READ_DISTANCE",
            "android.permission.health.READ_ELEVATION_GAINED",
            "android.permission.health.READ_FLOORS_CLIMBED",
            "android.permission.health.READ_HEART_RATE",
            "android.permission.health.READ_SPEED",
            "android.permission.health.READ_STEPS_CADENCE",
            "android.permission.health.READ_POWER",
            "android.permission.health.READ_VO2_MAX",
            "android.permission.health.READ_EXERCISE"
        ),
        "nutrition" to setOf(
            "android.permission.health.READ_NUTRITION",
            "android.permission.health.READ_HYDRATION"
        ),
        "recovery" to setOf(
            "android.permission.health.READ_RESTING_HEART_RATE",
            "android.permission.health.READ_SLEEP",
            "android.permission.health.READ_HEART_RATE_VARIABILITY",
            "android.permission.health.READ_OXYGEN_SATURATION",
            "android.permission.health.READ_RESPIRATORY_RATE"
        )
    )

    private fun categoriesFrom(call: PluginCall): Set<String> {
        val values = call.getArray("categories") ?: return emptySet()
        return (0 until values.length()).mapNotNull { values.getString(it) }.toSet()
    }

    private fun permissionsFor(categories: Set<String>) =
        categories.flatMap { permissionsByCategory[it].orEmpty() }.toSet()

    // Activity can still import a useful step total when a wearable or source
    // does not provide one of the optional metrics. All available permissions
    // are requested; only step access is required for the Activity connection.
    private fun minimumPermissionsFor(categories: Set<String>) =
        categories.flatMap { category ->
            if (category == "activity") setOf("android.permission.health.READ_STEPS")
            else if (category == "recovery") setOf("android.permission.health.READ_SLEEP")
            else permissionsByCategory[category].orEmpty()
        }.toSet()

    @com.getcapacitor.PluginMethod
    fun getStatus(call: PluginCall) {
        val status = HealthConnectClient.getSdkStatus(context)
        val result = JSObject()
        result.put(
            "status",
            when (status) {
                HealthConnectClient.SDK_AVAILABLE -> "available"
                HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED -> "update_required"
                else -> "unavailable"
            }
        )
        call.resolve(result)
    }

    @com.getcapacitor.PluginMethod
    fun requestHealthPermissions(call: PluginCall) {
        if (HealthConnectClient.getSdkStatus(context) != HealthConnectClient.SDK_AVAILABLE) {
            call.reject("Health Connect is not available on this device.")
            return
        }
        val permissions = permissionsFor(categoriesFrom(call))
        if (permissions.isEmpty()) {
            call.reject("Choose at least one Health Tracker category before connecting.")
            return
        }
        pendingPermissionCall = call
        (activity as? MainActivity)?.requestHealthConnectPermissions(permissions, this)
            ?: call.reject("Health Connect requires the Android app.")
    }

    fun onPermissionsResult(grantedPermissions: Set<String>) {
        val call = pendingPermissionCall ?: return
        pendingPermissionCall = null
        val result = JSObject()
        result.put("granted", grantedPermissions.containsAll(minimumPermissionsFor(categoriesFrom(call))))
        result.put("grantedPermissions", JSArray(grantedPermissions.toList()))
        call.resolve(result)
    }

    private fun addLog(
        output: JSArray,
        metric: String,
        time: Instant,
        value: Double?,
        unit: String,
        recordId: String,
        endTime: Instant? = null,
        label: String? = null
    ) {
        val row = JSObject()
        row.put("metric", metric)
        row.put("startTime", time.toString())
        endTime?.let { row.put("endTime", it.toString()) }
        value?.let { row.put("value", it) }
        row.put("unit", unit)
        row.put("sourceRecordId", recordId)
        label?.takeIf { it.isNotBlank() }?.let { row.put("label", it) }
        output.put(row)
    }

    private fun addDetailsLog(
        output: JSArray,
        metric: String,
        time: Instant,
        unit: String,
        recordId: String,
        details: JSObject,
        endTime: Instant? = null,
        value: Double? = null,
        label: String? = null
    ) {
        val row = JSObject()
        row.put("metric", metric)
        row.put("startTime", time.toString())
        endTime?.let { row.put("endTime", it.toString()) }
        value?.let { row.put("value", it) }
        row.put("unit", unit)
        row.put("sourceRecordId", recordId)
        row.put("details", details)
        label?.takeIf { it.isNotBlank() }?.let { row.put("label", it) }
        output.put(row)
    }

    @com.getcapacitor.PluginMethod
    fun importHealthData(call: PluginCall) {
        if (HealthConnectClient.getSdkStatus(context) != HealthConnectClient.SDK_AVAILABLE) {
            call.reject("Health Connect is not available on this device.")
            return
        }
        val categories = categoriesFrom(call)
        val requiredPermissions = minimumPermissionsFor(categories)
        if (categories.isEmpty() || requiredPermissions.isEmpty()) {
            call.reject("Choose at least one Health Tracker category before importing.")
            return
        }

        scope.launch {
            try {
                val client = HealthConnectClient.getOrCreate(context)
                val granted = client.permissionController.getGrantedPermissions()
                if (!granted.containsAll(requiredPermissions)) {
                    withContext(Dispatchers.Main) { call.reject("Allow the selected Health Connect access before importing.") }
                    return@launch
                }

                val end = Instant.now()
                val start = end.minusSeconds(30L * 24 * 60 * 60)
                val range = TimeRangeFilter.between(start, end)
                val bodyMeasurements = JSArray()
                val healthLogs = JSArray()
                val zone = ZoneId.systemDefault()

                if ("body" in categories) {
                    val bodyFatByDay = client.readRecords(ReadRecordsRequest(BodyFatRecord::class, range)).records
                        .groupBy { it.time.atZone(zone).toLocalDate().toString() }
                        .mapValues { (_, records) -> records.maxByOrNull { it.time } }

                    client.readRecords(ReadRecordsRequest(WeightRecord::class, range)).records.sortedBy { it.time }.forEach { record ->
                        val localTime = record.time.atZone(zone)
                        val row = JSObject()
                        row.put("date", localTime.toLocalDate().toString())
                        row.put("time", localTime.toLocalTime().format(DateTimeFormatter.ofPattern("HH:mm")))
                        row.put("weightKg", record.weight.inKilograms)
                        bodyFatByDay[row.getString("date")]?.let { bodyFat -> row.put("bodyFatPercent", bodyFat.percentage.value) }
                        bodyMeasurements.put(row)
                        addLog(healthLogs, "weight", record.time, record.weight.inKilograms, "kg", record.metadata.id)
                    }
                    client.readRecords(ReadRecordsRequest(BodyFatRecord::class, range)).records.forEach { record ->
                        addLog(healthLogs, "bodyFat", record.time, record.percentage.value, "percent", record.metadata.id)
                    }
                    client.readRecords(ReadRecordsRequest(LeanBodyMassRecord::class, range)).records.forEach { record ->
                        addLog(healthLogs, "leanBodyMass", record.time, record.mass.inKilograms, "kg", record.metadata.id)
                    }
                    client.readRecords(ReadRecordsRequest(HeightRecord::class, range)).records.forEach { record ->
                        addLog(healthLogs, "height", record.time, record.height.inMeters * 100, "cm", record.metadata.id)
                    }
                }

                if ("activity" in categories) {
                    // Activity totals are cumulative data. Read a total for each local
                    // calendar day instead of importing the source app's minute-sized fragments.
                    // Today is deliberately included so each refresh updates its running total.
                    val firstDay = start.atZone(zone).toLocalDate()
                    val lastDay = end.atZone(zone).toLocalDate()
                    var day: LocalDate = firstDay
                    while (!day.isAfter(lastDay)) {
                        val dayStart = day.atStartOfDay(zone).toInstant()
                        val dayEnd = minOf(day.plusDays(1).atStartOfDay(zone).toInstant(), end)
                        val activityMetrics = mutableSetOf<AggregateMetric<*>>(StepsRecord.COUNT_TOTAL)
                        if (granted.contains("android.permission.health.READ_ACTIVE_CALORIES_BURNED")) activityMetrics.add(ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL)
                        if (granted.contains("android.permission.health.READ_TOTAL_CALORIES_BURNED")) activityMetrics.add(TotalCaloriesBurnedRecord.ENERGY_TOTAL)
                        if (granted.contains("android.permission.health.READ_BASAL_METABOLIC_RATE")) activityMetrics.add(BasalMetabolicRateRecord.BASAL_CALORIES_TOTAL)
                        if (granted.contains("android.permission.health.READ_DISTANCE")) activityMetrics.add(DistanceRecord.DISTANCE_TOTAL)
                        if (granted.contains("android.permission.health.READ_ELEVATION_GAINED")) activityMetrics.add(ElevationGainedRecord.ELEVATION_GAINED_TOTAL)
                        if (granted.contains("android.permission.health.READ_FLOORS_CLIMBED")) activityMetrics.add(FloorsClimbedRecord.FLOORS_CLIMBED_TOTAL)
                        if (granted.contains("android.permission.health.READ_HEART_RATE")) {
                            activityMetrics.add(HeartRateRecord.BPM_AVG)
                            activityMetrics.add(HeartRateRecord.BPM_MIN)
                            activityMetrics.add(HeartRateRecord.BPM_MAX)
                        }
                        if (granted.contains("android.permission.health.READ_SPEED")) activityMetrics.add(SpeedRecord.SPEED_AVG)
                        if (granted.contains("android.permission.health.READ_STEPS_CADENCE")) activityMetrics.add(StepsCadenceRecord.RATE_AVG)
                        if (granted.contains("android.permission.health.READ_POWER")) activityMetrics.add(PowerRecord.POWER_AVG)
                        val aggregate = client.aggregate(
                            AggregateRequest(
                                metrics = activityMetrics,
                                timeRangeFilter = TimeRangeFilter.between(dayStart, dayEnd)
                            )
                        )
                        aggregate[StepsRecord.COUNT_TOTAL]?.let { total ->
                            addLog(healthLogs, "steps", dayStart, total.toDouble(), "count", "daily:${day}:steps", dayEnd)
                        }
                        aggregate[ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL]?.let { total ->
                            addLog(healthLogs, "activeCalories", dayStart, total.inKilocalories, "kcal", "daily:${day}:activeCalories", dayEnd)
                        }
                        aggregate[TotalCaloriesBurnedRecord.ENERGY_TOTAL]?.let { total ->
                            addLog(healthLogs, "totalCalories", dayStart, total.inKilocalories, "kcal", "daily:${day}:totalCalories", dayEnd)
                        }
                        aggregate[BasalMetabolicRateRecord.BASAL_CALORIES_TOTAL]?.let { total ->
                            addLog(healthLogs, "basalCalories", dayStart, total.inKilocalories, "kcal", "daily:${day}:basalCalories", dayEnd)
                        }
                        aggregate[DistanceRecord.DISTANCE_TOTAL]?.let { total ->
                            addLog(healthLogs, "distance", dayStart, total.inKilometers, "km", "daily:${day}:distance", dayEnd)
                        }
                        aggregate[ElevationGainedRecord.ELEVATION_GAINED_TOTAL]?.let { total ->
                            addLog(healthLogs, "elevation", dayStart, total.inMeters, "m", "daily:${day}:elevation", dayEnd)
                        }
                        aggregate[FloorsClimbedRecord.FLOORS_CLIMBED_TOTAL]?.let { total ->
                            addLog(healthLogs, "floors", dayStart, total, "floors", "daily:${day}:floors", dayEnd)
                        }
                        aggregate[HeartRateRecord.BPM_AVG]?.let { value -> addLog(healthLogs, "heartRateAverage", dayStart, value.toDouble(), "bpm", "daily:${day}:heartRateAverage", dayEnd) }
                        aggregate[HeartRateRecord.BPM_MIN]?.let { value -> addLog(healthLogs, "heartRateMinimum", dayStart, value.toDouble(), "bpm", "daily:${day}:heartRateMinimum", dayEnd) }
                        aggregate[HeartRateRecord.BPM_MAX]?.let { value -> addLog(healthLogs, "heartRateMaximum", dayStart, value.toDouble(), "bpm", "daily:${day}:heartRateMaximum", dayEnd) }
                        aggregate[SpeedRecord.SPEED_AVG]?.let { value -> addLog(healthLogs, "speedAverage", dayStart, value.inKilometersPerHour, "km/h", "daily:${day}:speedAverage", dayEnd) }
                        aggregate[StepsCadenceRecord.RATE_AVG]?.let { value -> addLog(healthLogs, "stepsCadence", dayStart, value, "steps/min", "daily:${day}:stepsCadence", dayEnd) }
                        aggregate[PowerRecord.POWER_AVG]?.let { value -> addLog(healthLogs, "powerAverage", dayStart, value.inWatts, "watts", "daily:${day}:powerAverage", dayEnd) }
                        day = day.plusDays(1)
                    }
                    if (granted.contains("android.permission.health.READ_EXERCISE")) {
                        client.readRecords(ReadRecordsRequest(ExerciseSessionRecord::class, range)).records.forEach { record ->
                            addLog(healthLogs, "exercise", record.startTime, null, "session", record.metadata.id, record.endTime, record.title)
                        }
                    }
                    if (granted.contains("android.permission.health.READ_VO2_MAX")) {
                        client.readRecords(ReadRecordsRequest(Vo2MaxRecord::class, range)).records.forEach { record ->
                            addLog(healthLogs, "vo2Max", record.time, record.vo2MillilitersPerMinuteKilogram, "ml/kg/min", record.metadata.id)
                        }
                    }
                }

                if ("nutrition" in categories) {
                    val firstDay = start.atZone(zone).toLocalDate()
                    val lastDay = end.atZone(zone).toLocalDate()
                    var day: LocalDate = firstDay
                    while (!day.isAfter(lastDay)) {
                        val dayStart = day.atStartOfDay(zone).toInstant()
                        val dayEnd = minOf(day.plusDays(1).atStartOfDay(zone).toInstant(), end)
                        val aggregate = client.aggregate(
                            AggregateRequest(
                                metrics = setOf(
                                    NutritionRecord.ENERGY_TOTAL, NutritionRecord.ENERGY_FROM_FAT_TOTAL,
                                    NutritionRecord.PROTEIN_TOTAL, NutritionRecord.TOTAL_CARBOHYDRATE_TOTAL,
                                    NutritionRecord.TOTAL_FAT_TOTAL, NutritionRecord.DIETARY_FIBER_TOTAL,
                                    NutritionRecord.SUGAR_TOTAL, NutritionRecord.SATURATED_FAT_TOTAL,
                                    NutritionRecord.MONOUNSATURATED_FAT_TOTAL, NutritionRecord.POLYUNSATURATED_FAT_TOTAL,
                                    NutritionRecord.UNSATURATED_FAT_TOTAL, NutritionRecord.TRANS_FAT_TOTAL,
                                    NutritionRecord.CHOLESTEROL_TOTAL, NutritionRecord.SODIUM_TOTAL,
                                    NutritionRecord.POTASSIUM_TOTAL, NutritionRecord.CALCIUM_TOTAL,
                                    NutritionRecord.IRON_TOTAL, NutritionRecord.MAGNESIUM_TOTAL,
                                    NutritionRecord.ZINC_TOTAL, NutritionRecord.CAFFEINE_TOTAL,
                                    NutritionRecord.FOLATE_TOTAL, NutritionRecord.FOLIC_ACID_TOTAL,
                                    NutritionRecord.VITAMIN_A_TOTAL, NutritionRecord.VITAMIN_B12_TOTAL,
                                    NutritionRecord.VITAMIN_B6_TOTAL, NutritionRecord.VITAMIN_C_TOTAL,
                                    NutritionRecord.VITAMIN_D_TOTAL, NutritionRecord.VITAMIN_E_TOTAL,
                                    NutritionRecord.VITAMIN_K_TOTAL, NutritionRecord.THIAMIN_TOTAL,
                                    NutritionRecord.RIBOFLAVIN_TOTAL, NutritionRecord.NIACIN_TOTAL,
                                    NutritionRecord.PANTOTHENIC_ACID_TOTAL, NutritionRecord.BIOTIN_TOTAL,
                                    NutritionRecord.CHROMIUM_TOTAL, NutritionRecord.COPPER_TOTAL,
                                    NutritionRecord.IODINE_TOTAL, NutritionRecord.MANGANESE_TOTAL,
                                    NutritionRecord.MOLYBDENUM_TOTAL, NutritionRecord.PHOSPHORUS_TOTAL,
                                    NutritionRecord.SELENIUM_TOTAL, NutritionRecord.CHLORIDE_TOTAL,
                                    HydrationRecord.VOLUME_TOTAL
                                ),
                                timeRangeFilter = TimeRangeFilter.between(dayStart, dayEnd)
                            )
                        )
                        val details = JSObject()
                        aggregate[NutritionRecord.ENERGY_TOTAL]?.let { details.put("calories_kcal", it.inKilocalories) }
                        aggregate[NutritionRecord.ENERGY_FROM_FAT_TOTAL]?.let { details.put("calories_from_fat_kcal", it.inKilocalories) }
                        aggregate[NutritionRecord.PROTEIN_TOTAL]?.let { details.put("protein_g", it.inGrams) }
                        aggregate[NutritionRecord.TOTAL_CARBOHYDRATE_TOTAL]?.let { details.put("carbohydrates_g", it.inGrams) }
                        aggregate[NutritionRecord.TOTAL_FAT_TOTAL]?.let { details.put("fat_g", it.inGrams) }
                        aggregate[NutritionRecord.DIETARY_FIBER_TOTAL]?.let { details.put("fiber_g", it.inGrams) }
                        aggregate[NutritionRecord.SUGAR_TOTAL]?.let { details.put("sugar_g", it.inGrams) }
                        aggregate[NutritionRecord.SATURATED_FAT_TOTAL]?.let { details.put("saturated_fat_g", it.inGrams) }
                        aggregate[NutritionRecord.MONOUNSATURATED_FAT_TOTAL]?.let { details.put("monounsaturated_fat_g", it.inGrams) }
                        aggregate[NutritionRecord.POLYUNSATURATED_FAT_TOTAL]?.let { details.put("polyunsaturated_fat_g", it.inGrams) }
                        aggregate[NutritionRecord.UNSATURATED_FAT_TOTAL]?.let { details.put("unsaturated_fat_g", it.inGrams) }
                        aggregate[NutritionRecord.TRANS_FAT_TOTAL]?.let { details.put("trans_fat_g", it.inGrams) }
                        aggregate[NutritionRecord.CHOLESTEROL_TOTAL]?.let { details.put("cholesterol_mg", it.inMilligrams) }
                        aggregate[NutritionRecord.SODIUM_TOTAL]?.let { details.put("sodium_mg", it.inMilligrams) }
                        aggregate[NutritionRecord.POTASSIUM_TOTAL]?.let { details.put("potassium_mg", it.inMilligrams) }
                        aggregate[NutritionRecord.CALCIUM_TOTAL]?.let { details.put("calcium_mg", it.inMilligrams) }
                        aggregate[NutritionRecord.IRON_TOTAL]?.let { details.put("iron_mg", it.inMilligrams) }
                        aggregate[NutritionRecord.MAGNESIUM_TOTAL]?.let { details.put("magnesium_mg", it.inMilligrams) }
                        aggregate[NutritionRecord.ZINC_TOTAL]?.let { details.put("zinc_mg", it.inMilligrams) }
                        aggregate[NutritionRecord.CAFFEINE_TOTAL]?.let { details.put("caffeine_mg", it.inMilligrams) }
                        aggregate[NutritionRecord.FOLATE_TOTAL]?.let { details.put("folate_mcg", it.inMicrograms) }
                        aggregate[NutritionRecord.FOLIC_ACID_TOTAL]?.let { details.put("folic_acid_mcg", it.inMicrograms) }
                        aggregate[NutritionRecord.VITAMIN_A_TOTAL]?.let { details.put("vitamin_a_mcg", it.inMicrograms) }
                        aggregate[NutritionRecord.VITAMIN_B12_TOTAL]?.let { details.put("vitamin_b12_mcg", it.inMicrograms) }
                        aggregate[NutritionRecord.VITAMIN_B6_TOTAL]?.let { details.put("vitamin_b6_mg", it.inMilligrams) }
                        aggregate[NutritionRecord.VITAMIN_C_TOTAL]?.let { details.put("vitamin_c_mg", it.inMilligrams) }
                        aggregate[NutritionRecord.VITAMIN_D_TOTAL]?.let { details.put("vitamin_d_mcg", it.inMicrograms) }
                        aggregate[NutritionRecord.VITAMIN_E_TOTAL]?.let { details.put("vitamin_e_mg", it.inMilligrams) }
                        aggregate[NutritionRecord.VITAMIN_K_TOTAL]?.let { details.put("vitamin_k_mcg", it.inMicrograms) }
                        aggregate[NutritionRecord.THIAMIN_TOTAL]?.let { details.put("thiamin_mg", it.inMilligrams) }
                        aggregate[NutritionRecord.RIBOFLAVIN_TOTAL]?.let { details.put("riboflavin_mg", it.inMilligrams) }
                        aggregate[NutritionRecord.NIACIN_TOTAL]?.let { details.put("niacin_mg", it.inMilligrams) }
                        aggregate[NutritionRecord.PANTOTHENIC_ACID_TOTAL]?.let { details.put("pantothenic_acid_mg", it.inMilligrams) }
                        aggregate[NutritionRecord.BIOTIN_TOTAL]?.let { details.put("biotin_mcg", it.inMicrograms) }
                        aggregate[NutritionRecord.CHROMIUM_TOTAL]?.let { details.put("chromium_mcg", it.inMicrograms) }
                        aggregate[NutritionRecord.COPPER_TOTAL]?.let { details.put("copper_mg", it.inMilligrams) }
                        aggregate[NutritionRecord.IODINE_TOTAL]?.let { details.put("iodine_mcg", it.inMicrograms) }
                        aggregate[NutritionRecord.MANGANESE_TOTAL]?.let { details.put("manganese_mg", it.inMilligrams) }
                        aggregate[NutritionRecord.MOLYBDENUM_TOTAL]?.let { details.put("molybdenum_mcg", it.inMicrograms) }
                        aggregate[NutritionRecord.PHOSPHORUS_TOTAL]?.let { details.put("phosphorus_mg", it.inMilligrams) }
                        aggregate[NutritionRecord.SELENIUM_TOTAL]?.let { details.put("selenium_mcg", it.inMicrograms) }
                        aggregate[NutritionRecord.CHLORIDE_TOTAL]?.let { details.put("chloride_mg", it.inMilligrams) }
                        if (details.length() > 0) addDetailsLog(healthLogs, "nutrition", dayStart, "nutrition", "daily:${day}:nutrition", details, dayEnd, aggregate[NutritionRecord.ENERGY_TOTAL]?.inKilocalories, "Daily nutrition")
                        aggregate[HydrationRecord.VOLUME_TOTAL]?.let { value -> addLog(healthLogs, "hydration", dayStart, value.inMilliliters, "mL", "daily:${day}:hydration", dayEnd) }
                        day = day.plusDays(1)
                    }
                }

                if ("recovery" in categories) {
                    // Recovery is not a Health Connect record type. Import the
                    // underlying signals that compatible devices (including the
                    // Hume Band) share instead, so the app never invents a score.
                    if (granted.contains("android.permission.health.READ_RESTING_HEART_RATE")) {
                        client.readRecords(ReadRecordsRequest(RestingHeartRateRecord::class, range)).records.forEach { record ->
                            addLog(healthLogs, "restingHeartRate", record.time, record.beatsPerMinute.toDouble(), "bpm", record.metadata.id)
                        }
                    }
                    if (granted.contains("android.permission.health.READ_SLEEP")) {
                        // Health Connect's Aggregate API applies the user's Sleep
                        // app priority and deduplicates overlapping source records.
                        // Use noon-to-noon windows so overnight sleep is assigned
                        // to the day the user wakes instead of being split at midnight.
                        val firstSleepDay = start.atZone(zone).toLocalDate().plusDays(1)
                        val lastSleepDay = end.atZone(zone).toLocalDate()
                        var sleepDay = firstSleepDay
                        while (!sleepDay.isAfter(lastSleepDay)) {
                            val sleepWindowStart = sleepDay.minusDays(1).atTime(12, 0).atZone(zone).toInstant()
                            val sleepWindowEnd = minOf(sleepDay.atTime(12, 0).atZone(zone).toInstant(), end)
                            if (sleepWindowStart.isBefore(sleepWindowEnd)) {
                                val sleepAggregate = client.aggregate(
                                    AggregateRequest(
                                        metrics = setOf(SleepSessionRecord.SLEEP_DURATION_TOTAL),
                                        timeRangeFilter = TimeRangeFilter.between(sleepWindowStart, sleepWindowEnd)
                                    )
                                )
                                sleepAggregate[SleepSessionRecord.SLEEP_DURATION_TOTAL]?.let { duration ->
                                    val dayStart = sleepDay.atStartOfDay(zone).toInstant()
                                    val dayEnd = sleepDay.plusDays(1).atStartOfDay(zone).toInstant()
                                    // Keep these distinct from the incorrect manually merged
                                    // daily records produced by the previous importer.
                                    addLog(healthLogs, "sleep", dayStart, duration.toMinutes().toDouble(), "minutes", "aggregate-noon:${sleepDay}:sleep", dayEnd, "Daily sleep total")
                                }
                            }
                            sleepDay = sleepDay.plusDays(1)
                        }
                    }
                    if (granted.contains("android.permission.health.READ_HEART_RATE_VARIABILITY")) {
                        client.readRecords(ReadRecordsRequest(HeartRateVariabilityRmssdRecord::class, range)).records.forEach { record ->
                            addLog(healthLogs, "heartRateVariability", record.time, record.heartRateVariabilityMillis, "ms", record.metadata.id)
                        }
                    }
                    if (granted.contains("android.permission.health.READ_OXYGEN_SATURATION")) {
                        client.readRecords(ReadRecordsRequest(OxygenSaturationRecord::class, range)).records.forEach { record ->
                            addLog(healthLogs, "oxygenSaturation", record.time, record.percentage.value * 100, "percent", record.metadata.id)
                        }
                    }
                    if (granted.contains("android.permission.health.READ_RESPIRATORY_RATE")) {
                        client.readRecords(ReadRecordsRequest(RespiratoryRateRecord::class, range)).records.forEach { record ->
                            addLog(healthLogs, "respiratoryRate", record.time, record.rate, "breaths/min", record.metadata.id)
                        }
                    }
                }

                val response = JSObject()
                response.put("measurements", bodyMeasurements)
                response.put("healthLogs", healthLogs)
                withContext(Dispatchers.Main) { call.resolve(response) }
            } catch (error: Exception) {
                withContext(Dispatchers.Main) { call.reject(error.message ?: "Unable to import Health Connect data.") }
            }
        }
    }
}
