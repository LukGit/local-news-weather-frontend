import { combineReducers } from "redux";

// this combined reducer contains four redux store items

const rootReducer = combineReducers({
  users: usersReducer,
  reports: reportsReducer,
  c_reports: caneReportsReducer
});

export default rootReducer;

function usersReducer(state = { user: '', userId: 0, zipcode: 0, gps: {}}, action) {
  switch (action.type) {
    // when login and current_user return the username and id
    case "LOGIN":
    case "CURRENT_USER":
      return {
        user: action.userData.username,
        userId: action.userData.id,
        zipcode: action.userData.zipcode,
        gps: action.userData.gps
      }
    default:
      return state
    }
}

function reportsReducer(state = [], action) {
  switch (action.type) {
      // when add_report return all earthquakes to store
    case "ADD_REPORT":
      return [...action.reports]    
      // when logout clear store
    case "LOGOUT":
      return []
    default:
      return state
  }
}
function caneReportsReducer(state = [], action) {
  switch (action.type) {
      // when add_cane_report return all hurricanes to store
    case "ADD_CANE_REPORT":
      return [...action.c_reports]
      // when logout clear store
    case "LOGOUT":
      return []
    default:
      return state
  }
}