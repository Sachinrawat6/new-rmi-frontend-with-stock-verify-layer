import axios from 'axios';
const fetchFabricDataFromGoogleSheet = async () => {
  try {
    const sheetId = '1SIP3Glxo5vkL0Jvx9ulj0p6xZoOh0ruzRtIqzldmb8E';
    const apiKey = 'AIzaSyAGjWAyG29vKBgiYVSXCn08cu5ym6FwiQs';
    const range = 'Fabric Rate!A1:J';
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${apiKey}`;

    const response = await axios.get(url);

    const fabrics = [];

    for (let i = 1; i < response.data.values.length; i++) {
      const [
        fabric_number,
        fabric_rate,
        unit,
        length,
        fabric_name,
        vender,
        width,
        recieved_qty_meter,
        recieved_qty_kg,
        date,
      ] = response.data.values[i];

      fabrics.push({
        fabric_number,
        fabric_rate,
        unit,
        length,
        fabric_name,
        vender,
        width,
        recieved_qty_meter,
        recieved_qty_kg,
        date,
      });
    }

    return fabrics;
  } catch (error) {
    console.error('Failed to fetch fabric data from google sheet :: ', error?.message);
    throw error;
  }
};

const fetchFabricNoFromFabricAverageSheet = async () => {
  try {
    const sheetId = '1SIP3Glxo5vkL0Jvx9ulj0p6xZoOh0ruzRtIqzldmb8E';
    const apiKey = 'AIzaSyAGjWAyG29vKBgiYVSXCn08cu5ym6FwiQs';
    const range = 'Fabric Average Sheet!A1:L';
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${apiKey}`;

    const response = await axios.get(url);

    const fabrics = [];

    for (let i = 1; i < response.data.values.length; i++) {
      const [
        style_number,
        pattern_number,
        article_type,
        style_image,
        fabric_1_no,
        fabric_1_name,
        fabric_1_image,
        fabric_2_no,
        fabric_2_name,
        fabric_2_image,
        fabric_3_no,
        fabric_3_name,
      ] = response.data.values[i];

      fabrics.push({
        style_number,
        pattern_number,
        article_type,
        style_image,
        fabric_1_no,
        fabric_1_name,
        fabric_1_image,
        fabric_2_no,
        fabric_2_name,
        fabric_2_image,
        fabric_3_no,
        fabric_3_name,
      });
    }

    return fabrics;
  } catch (error) {
    console.error(
      'Failed to fetch fabric no data from fabric average  google sheet :: ',
      error?.message
    );
    throw error;
  }
};

const fetchFabricNoFromStylwise = async () => {
  try {
    const sheetId = '1SIP3Glxo5vkL0Jvx9ulj0p6xZoOh0ruzRtIqzldmb8E';
    const apiKey = 'AIzaSyAGjWAyG29vKBgiYVSXCn08cu5ym6FwiQs';
    const range = 'Stylewise New Fabric No!A1:L';
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${apiKey}`;

    const response = await axios.get(url);

    const fabrics = [];

    for (let i = 1; i < response.data.values.length; i++) {
      const [
        style_number,
        fabric_1_no,
        fabric_1_name,
        fabric_2_no,
        fabric_2_name,
        fabric_3_no,
        fabric_3_name,
      ] = response.data.values[i];

      fabrics.push({
        style_number,
        fabric_1_no,
        fabric_1_name,
        fabric_2_no,
        fabric_2_name,
        fabric_3_no,
        fabric_3_name,
      });
    }

    return fabrics;
  } catch (error) {
    console.error(
      'Failed to fetch fabric no data from fabric average  google sheet :: ',
      error?.message
    );
    throw error;
  }
};

const fetchColorsFromGoogleSheet = async () => {
  try {
    const sheetId = '1SIP3Glxo5vkL0Jvx9ulj0p6xZoOh0ruzRtIqzldmb8E';
    const apiKey = 'AIzaSyAGjWAyG29vKBgiYVSXCn08cu5ym6FwiQs';
    const range = 'catalogue tracker!D1:F';
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${apiKey}`;

    const response = await axios.get(url);
    const colors = [];

    for (let i = 1; i < response.data.values.length; i++) {
      const [style_number, free_size, color] = response.data.values[i];
      if (!style_number || !color) continue;

      colors.push({
        style_number: Number(style_number),
        free_size,
        color: color.trim(),
      });
    }

    console.log('Colors fetched from Google Sheet :: ', colors);
    return colors;
  } catch (error) {
    console.error('Failed to fetch color from  google sheet :: ', error?.message);
    throw error;
  }
};

const fetchCoordsStyleFromGoogleSheet = async () => {
  try {
    const sheetId = '1SIP3Glxo5vkL0Jvx9ulj0p6xZoOh0ruzRtIqzldmb8E';
    const apiKey = 'AIzaSyAGjWAyG29vKBgiYVSXCn08cu5ym6FwiQs';
    const range = 'Coords data!A1:C';
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${apiKey}`;

    const response = await axios.get(url);
    const coords = [];

    for (let i = 1; i < response.data.values.length; i++) {
      const [coordStyle, style1, style2] = response.data.values[i];
      if (!coordStyle || isNaN(Number(coordStyle)) || !style1 || !style2) continue;

      coords.push({
        coordStyle: Number(coordStyle),
        style1: Number(style1),
        style2: Number(style2),
      });
    }

    // console.log('Coords fetched from Google Sheet :: ', coords);
    return coords;
  } catch (error) {
    console.error('Failed to fetch coords from  google sheet :: ', error?.message);
    throw error;
  }
};

export {
  fetchFabricDataFromGoogleSheet,
  fetchFabricNoFromFabricAverageSheet,
  fetchFabricNoFromStylwise,
  fetchColorsFromGoogleSheet,
  fetchCoordsStyleFromGoogleSheet,
};
