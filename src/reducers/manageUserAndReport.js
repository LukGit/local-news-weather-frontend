import { combineReducers } from "redux";

// this combined reducer contains four redux store items

const rootReducer = combineReducers({
  users: usersReducer,
  reports: reportsReducer
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
      // then add_course return all courses to store
    case "ADD_REPORT":
      return [...action.reports]
      // when logout clear store
    case "LOGOUT":
      return []
    default:
      return state
  }
}