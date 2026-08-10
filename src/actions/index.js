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
export const addFireReport = f_reports => {
  return {
    type: 'ADD_FIRE_REPORT',
    f_reports
  };
};
export const setUserGps = (gps) => {
  return {
    type: 'SET_USER_GPS',
    gps
  };
};
