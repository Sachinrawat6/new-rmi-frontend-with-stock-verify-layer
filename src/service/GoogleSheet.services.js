import axios from 'axios';
import {
  GOOGLE_SHEET_API_KEY,
  GOOGLE_SHEET_BASE_URL,
  GOOGLE_SHEET_ID,
  GOOGLE_SHEET_FABRIC_RATE_RANGE,
  GOOGLE_SHEET_FABRIC_AVERAGE_RANGE,
  GOOGLE_SHEET_FABRIC_NO_RANGE,
  GOOGLE_SHEET_COLORS_RANGE,
  GOOGLE_SHEET_COORDS_STYLE_RANGE,
  GOOGLE_SHEET_FABRIC_STYLE_MAPPING_RANGE,
} from '../constant';
const fetchFabricDataFromGoogleSheet = async () => {
  try {
    const sheetId = GOOGLE_SHEET_ID;
    const apiKey = GOOGLE_SHEET_API_KEY;
    const range = GOOGLE_SHEET_FABRIC_RATE_RANGE;
    const url = `${GOOGLE_SHEET_BASE_URL}/${sheetId}/values/${range}?key=${apiKey}`;

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
    const sheetId = GOOGLE_SHEET_ID;
    const apiKey = GOOGLE_SHEET_API_KEY;
    const range = GOOGLE_SHEET_FABRIC_AVERAGE_RANGE;
    const url = `${GOOGLE_SHEET_BASE_URL}/${sheetId}/values/${range}?key=${apiKey}`;

    const response = await axios.get(url);

    const rows = response.data.values || [];
    const fabrics = [];

    const hasValue = (v) => v !== undefined && v !== null && String(v).trim() !== '';

    for (let i = 1; i < rows.length; i++) {
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
      ] = rows[i];

      // fabric 1 nahi hai to poori row skip
      if (!hasValue(fabric_1_no)) continue;

      const fabric = {
        style_number,
        pattern_number,
        article_type,
        style_image,
        fabric_1_no,
        fabric_1_name,
        fabric_1_image,
      };

      // fabric 2 sirf tab add ho jab uska number ho
      if (hasValue(fabric_2_no)) {
        fabric.fabric_2_no = fabric_2_no;
        fabric.fabric_2_name = fabric_2_name;
        fabric.fabric_2_image = fabric_2_image;
      }

      // fabric 3 sirf tab add ho jab uska number ho
      if (hasValue(fabric_3_no)) {
        fabric.fabric_3_no = fabric_3_no;
        fabric.fabric_3_name = fabric_3_name;
      }

      fabrics.push(fabric);
    }

    return fabrics;
  } catch (error) {
    console.error(
      'Failed to fetch fabric no data from fabric average google sheet :: ',
      error?.message
    );
    throw error;
  }
};

const fetchFabricNoFromStylwise = async () => {
  try {
    const sheetId = GOOGLE_SHEET_ID;
    const apiKey = GOOGLE_SHEET_API_KEY;
    const range = GOOGLE_SHEET_FABRIC_NO_RANGE;
    const url = `${GOOGLE_SHEET_BASE_URL}/${sheetId}/values/${range}?key=${apiKey}`;

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
    const sheetId = GOOGLE_SHEET_ID;
    const apiKey = GOOGLE_SHEET_API_KEY;
    const range = GOOGLE_SHEET_COLORS_RANGE;
    const url = `${GOOGLE_SHEET_BASE_URL}/${sheetId}/values/${range}?key=${apiKey}`;

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
    const sheetId = GOOGLE_SHEET_ID;
    const apiKey = GOOGLE_SHEET_API_KEY;
    const range = GOOGLE_SHEET_COORDS_STYLE_RANGE;
    const url = `${GOOGLE_SHEET_BASE_URL}/${sheetId}/values/${range}?key=${apiKey}`;

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

const fetchFabricStyleMappingFromGoogleSheet = async () => {
  try {
    const sheetId = GOOGLE_SHEET_ID;
    const apiKey = GOOGLE_SHEET_API_KEY;
    const range = GOOGLE_SHEET_FABRIC_STYLE_MAPPING_RANGE;
    const url = `${GOOGLE_SHEET_BASE_URL}/${sheetId}/values/${range}?key=${apiKey}`;

    const response = await axios.get(url);
    const fabricStyleMappings = [];

    for (let i = 1; i < response.data.values.length; i++) {
      const [fabric_name, fabric_no, style_numbers, vendor_source, blocked_days] =
        response.data.values[i];
      if (!fabric_no) continue;

      fabricStyleMappings.push({
        fabricNo: Number(fabric_no),
        styleNumbers: style_numbers ? style_numbers.split(',').map((s) => Number(s)) : [],
        fabricName: fabric_name?.trim(),
        vendorSource: vendor_source?.trim(),
        blockedDays: Number(blocked_days),
      });
    }

    // console.log('Fabric Style Mappings fetched from Google Sheet :: ', fabricStyleMappings);
    return fabricStyleMappings;
  } catch (error) {
    console.error('Failed to fetch fabric style mappings from Google Sheet :: ', error?.message);
    throw error;
  }
};

export {
  fetchFabricDataFromGoogleSheet,
  fetchFabricNoFromFabricAverageSheet,
  fetchFabricNoFromStylwise,
  fetchColorsFromGoogleSheet,
  fetchCoordsStyleFromGoogleSheet,
  fetchFabricStyleMappingFromGoogleSheet,
};
