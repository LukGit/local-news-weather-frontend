// get user when login
export const addUser = userData => {
  return {
    type: 'LOGIN',
    userData
  };
};
export const currentUser = (userData) => {
  return {
    type: "CURRENT_USER",
    userData
  }
}
export const logoutUser = () => {
  return {
    type: 'LOGOUT'
  };
};
export const addReport = reports => {
  return {
    type: 'ADD_REPORT',
    reports
  };
};
export const addCaneReport = c_reports => {
  return {
    type: 'ADD_CANE_REPORT',
    c_reports
  };
};