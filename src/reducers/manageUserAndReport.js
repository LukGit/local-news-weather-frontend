import { combineReducers } from "redux";

// 1. DECLARE INITIAL STATE FIRST (At the top)
const initialUserState = {
  user: 'Guest',
  userId: 0,
  zipcode: 0,
  gps: { lat: 22.3193, lng: 114.1694 } // Default fallback (Hong Kong)
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
   /*  case "LOGOUT":
      return []; */
    default:
      return state;
  }
}

function caneReportsReducer(state = [], action) {
  switch (action.type) {
    case "ADD_CANE_REPORT":
      return [...action.c_reports];
    /* case "LOGOUT":
      return []; */
    default:
      return state;
  }
}

function fireReportsReducer(state = [], action) {
  switch (action.type) {
    case "ADD_FIRE_REPORT":
      return [...action.f_reports];
    /* case "LOGOUT":
      return []; */
    default:
      return state;
  }
}

// 3. COMBINE & EXPORT AT THE BOTTOM
const rootReducer = combineReducers({
  users: usersReducer,
  reports: reportsReducer,
  c_reports: caneReportsReducer,
  f_reports: fireReportsReducer
});

export default rootReducer;
