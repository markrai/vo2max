// Workout data and transformation
const workoutData = {
  "weekly_plan": [
    {
      "day": "Monday",
      "type": "VO2 Intervals (10×1)",
      "machine": "Bike",
      "warmup": {
        "duration_min": 12,
        "target_hr_bpm": "130–140"
      },
      "main_set": {
        "description": "10×(1 min hard / 1 min easy)",
        "intervals": [
          {
            "phase": "hard",
            "duration_sec": 60,
            "target_hr_bpm": "167–176"
          },
          {
            "phase": "easy",
            "duration_sec": 60,
            "target_hr_bpm": "130–145"
          }
        ]
      },
      "cooldown ❄️": {
        "duration_min": 5,
        "target_hr_bpm": "<120"
      }
    },
    {
      "day": "Tuesday",
      "type": "Zone 2",
      "machine": "Elliptical",
      "warmup": {
        "duration_min": 8,
        "target_hr_bpm": "110–120"
      },
      "main_set": {
        "duration_min": "60–75",
        "target_hr_bpm": "120–135"
      },
      "cooldown ❄️": {
        "duration_min": 5,
        "target_hr_bpm": "<115"
      }
    },
    {
      "day": "Wednesday",
      "type": "Strength",
      "machine": "Combo Machine",
      "warmup": {
        "duration_min": 5,
        "target_hr_bpm": "100–115"
      },
      "main_set": {
        "duration_min": "20–30",
        "notes": "HR not target-driven"
      },
      "cooldown ❄️": {
        "duration_min": 3,
        "target_hr_bpm": "<105"
      }
    },
    {
      "day": "Thursday",
      "type": "Threshold",
      "machine": "Bike",
      "warmup": {
        "duration_min": 10,
        "target_hr_bpm": "135–145"
      },
      "main_set": {
        "duration_min": "20–25",
        "target_hr_bpm": "155–165"
      },
      "cooldown ❄️": {
        "duration_min": 5,
        "target_hr_bpm": "<120"
      }
    },
    {
      "day": "Friday",
      "type": "4×4 Intervals",
      "machine": "Bike",
      "warmup": {
        "duration_min": 12,
        "target_hr_bpm": "105 → 150",
        "subsections": [
          {
            "name": "Very Easy",
            "start_min": 0,
            "end_min": 3,
            "target_hr_bpm": "105–120",
            "notes": "Light pedals. No tension in chest or legs."
          },
          {
            "name": "Easy Steady",
            "start_min": 3,
            "end_min": 6,
            "target_hr_bpm": "120–130",
            "notes": "Start breathing rhythmically. Smooth, even cadence."
          },
          {
            "name": "Moderate Build",
            "start_min": 6,
            "end_min": 9,
            "target_hr_bpm": "130–140",
            "notes": "Increase cadence + slight resistance. Let legs warm, don't force it."
          },
          {
            "name": "Controlled Pre-Load",
            "start_min": 9,
            "end_min": 12,
            "target_hr_bpm": "140–150",
            "notes": "Think \"sustainably firm, not hard\". This primes your HR response for rep #1."
          }
        ]
      },
      "main_set": {
        "description": "4×(4 min hard / 3 min easy)",
        "intervals": [
          {
            "phase": "Interval 1 🔥",
            "duration_min": 4,
            "target_hr_bpm": "158–162"
          },
          {
            "phase": "Recovery 1",
            "duration_min": 3,
            "target_hr_bpm": "125–140"
          },
          {
            "phase": "Interval 2 🔥",
            "duration_min": 4,
            "target_hr_bpm": "163–167"
          },
          {
            "phase": "Recovery 2",
            "duration_min": 3,
            "target_hr_bpm": "125–140"
          },
          {
            "phase": "Interval 3 🔥",
            "duration_min": 4,
            "target_hr_bpm": "165–170"
          },
          {
            "phase": "Recovery 3",
            "duration_min": 3,
            "target_hr_bpm": "125–140"
          },
          {
            "phase": "Interval 4 🔥",
            "duration_min": 4,
            "target_hr_bpm": "168–172"
          }
        ]
      },
      "cooldown ❄️": {
        "duration_min": 5,
        "target_hr_bpm": "<115"
      }
    },
    {
      "day": "Saturday",
      "type": "Long Zone 2",
      "machine": "Elliptical or Bike",
      "warmup": {
        "duration_min": 10,
        "target_hr_bpm": "110–120"
      },
      "main_set": {
        "duration_min": "75–90",
        "target_hr_bpm": "120–135"
      },
      "cooldown ❄️": {
        "duration_min": 5,
        "target_hr_bpm": "<115"
      }
    },
    {
      "day": "Sunday",
      "type": "Recovery Session",
      "machine": "Bike or Elliptical",
      "warmup": {
        "duration_min": 3,
        "target_hr_bpm": "<110"
      },
      "main_set": {
        "duration_min": "30–40",
        "target_hr_bpm": "<115"
      },
      "cooldown ❄️": {
        "duration_min": 3,
        "target_hr_bpm": "<105"
      }
    }
  ]
};

// Shared state
let plan = {};
let workoutMetadata = {}; // Store type and machine for each day
let hrTargets = {}; // Store HR targets for each day's phases

// Helper function to parse duration_min (handles strings like "60–75" or numbers)
function parseDuration(duration) {
  if (typeof duration === 'number') return duration;
  if (typeof duration === 'string') {
    // Handle ranges like "60–75" or "20–30" - take the first number
    const match = duration.match(/^(\d+)/);
    if (match) return parseInt(match[1]);
  }
  return 0;
}

// Transform data.json workout structure to the format expected by the app
function transformWorkoutData(workoutData) {
  const transformed = {};
  
  if (!workoutData || !workoutData.weekly_plan) {
    console.error('Invalid workout data structure');
    return transformed;
  }
  
  workoutData.weekly_plan.forEach(workout => {
    if (!workout || !workout.day) {
      return;
    }
    
    const warm = parseDuration(workout.warmup?.duration_min || 0);
    const cool = parseDuration(workout.cooldown?.duration_min || 0);
    
    // Store HR targets
    hrTargets[workout.day] = {
      warmup: workout.warmup?.target_hr_bpm || "",
      warmup_subsections: workout.warmup?.subsections || null,
      cooldown: workout.cooldown?.target_hr_bpm || "",
      main_set: workout.main_set?.target_hr_bpm || "",
      intervals: null // Will be populated for interval workouts
    };
    
    // Calculate sustain duration from main_set
    let sustain = 0;
    if (workout.main_set) {
      if (workout.main_set.duration_min) {
        // Simple duration
        sustain = parseDuration(workout.main_set.duration_min);
      } else if (workout.main_set.intervals && Array.isArray(workout.main_set.intervals)) {
        // Interval-based workout
        const intervals = workout.main_set.intervals;
        
        // Check if this is a repeating pattern (like Monday) or a sequence (like Friday)
        // If intervals have specific names like "Interval 1", "Interval 2", etc., it's a sequence
        const isSequence = intervals.some(i => i.phase && /Interval \d+|Recovery \d+/.test(i.phase));
        
        let totalDuration = 0;
        const intervalPhases = [];
        
        intervals.forEach(interval => {
          let intervalDuration = 0;
          if (interval.duration_sec) {
            intervalDuration = interval.duration_sec / 60; // convert to minutes
          } else if (interval.duration_min) {
            intervalDuration = parseDuration(interval.duration_min);
          }
          totalDuration += intervalDuration;
          
          // Store interval phase info for HR targets
          intervalPhases.push({
            phase: interval.phase,
            duration: intervalDuration,
            target_hr_bpm: interval.target_hr_bpm || ""
          });
        });
        
        if (isSequence) {
          // For sequences (like Friday with Interval 1, Recovery 1, etc.), use total duration
          // All phases are already in the array, no repetition needed
          sustain = totalDuration;
          hrTargets[workout.day].intervals = {
            phases: intervalPhases,
            repetitions: 1, // Sequences don't repeat
            isSequence: true
          };
        } else {
          // For repeating patterns (like Monday), calculate repetitions from description
          let repetitions = 1;
          if (workout.main_set.description) {
            const match = workout.main_set.description.match(/(\d+)×/);
            if (match) {
              repetitions = parseInt(match[1]);
            }
          }
          
          // For repeating patterns, the intervals array contains one cycle
          // Multiply by repetitions to get total duration
          sustain = totalDuration * repetitions;
          
          hrTargets[workout.day].intervals = {
            phases: intervalPhases,
            repetitions: repetitions,
            isSequence: false
          };
        }
      }
    }
    
    // Only add to transformed if we have valid workout data
    if (warm > 0 || sustain > 0 || cool > 0) {
      transformed[workout.day] = { warm, sustain, cool };
      // Store metadata (type and machine) for display
      workoutMetadata[workout.day] = {
        type: workout.type || "",
        machine: workout.machine || ""
      };
    } else {
      transformed[workout.day] = null;
    }
  });
  
  return transformed;
}

// Initialize workout plan from embedded data
function initializeWorkoutPlan() {
  workoutMetadata = {}; // Reset metadata
  hrTargets = {}; // Reset HR targets
  plan = transformWorkoutData(workoutData);
  console.log('Plan after transformation:', plan);
  const today = todayName();
  console.log('Today is:', today, 'Plan for today:', plan[today]);
}

// Getter functions for shared state
function getPlan() { return plan; }
function getWorkoutMetadata() { return workoutMetadata; }
function getHrTargets() { return hrTargets; }

