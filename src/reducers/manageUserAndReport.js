import { combineReducers } from "redux";

// 1. DECLARE INITIAL STATE FIRST (At the top)
const initialUserState = {
  user: 'Guest',
  userId: 0,
  zipcode: 0,
  gps: { lat: 22.3193, lng: 114.1694 } // Default fallback (Hong Kong)
};

// NEW: Water state holds both isolated datasets
const initialWaterState = {
  w_reports: [],
  nws_reports: []
};

// 2. REDUCERS (Now initialUserState is fully initialized when these run)
function usersReducer(state = initialUserState, action) {
  switch (action.type) {
    case "SET_USER_GPS":
      return {
        ...state,
        gps: action.gps
      };
    default:
      return state;
  }
}

function reportsReducer(state = [], action) {
  switch (action.type) {
    case "ADD_REPORT":
      return [...action.reports];
    default:
      return state;
  }
}

function caneReportsReducer(state = [], action) {
  switch (action.type) {
    case "ADD_CANE_REPORT":
      return [...action.c_reports];
    default:
      return state;
  }
}

function fireReportsReducer(state = [], action) {
  switch (action.type) {
    case "ADD_FIRE_REPORT":
      return [...action.f_reports];
    default:
      return state;
  }
}

function tornadoReportsReducer(state = [], action) {
  switch (action.type) {
    case "ADD_TORNADO_REPORT":
      return [...action.t_reports];
    default:
      return state;
  }
}

// UPDATED: Water/Flood Reports Reducer
function waterReportsReducer(state = initialWaterState, action) {
    switch (action.type) {
        case "ADD_WATER_REPORT":
            return { ...state, w_reports: action.w_reports };
        case "ADD_NWS_REPORT":
            return { ...state, nws_reports: action.nws_reports };
        default:
            return state;
    }
}
// 3. COMBINE & EXPORT AT THE BOTTOM
const rootReducer = combineReducers({
  users: usersReducer,
  reports: reportsReducer,
  c_reports: caneReportsReducer,
  f_reports: fireReportsReducer,
  t_reports: tornadoReportsReducer,
  water: waterReportsReducer // RENAMED: 'water' accesses both dataset
});

export default rootReducer;
