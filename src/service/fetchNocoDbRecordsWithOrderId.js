import axios from 'axios';

const fetchOrderFromNocoDbWithOrderId = async (order_id) => {
  const options = {
    method: 'GET',
    url: 'https://nocodb.qurvii.com/api/v2/tables/m9lzzdoc2x4zxun/records',
    params: {
      where: `(order_id,eq,${order_id})`,
      viewId: 'vwwsae9mswybppcm',
    },
    headers: {
      'xc-token': 'QXOzKHJ982NgA2AIc8jDqK0lC5CdWEcCwacCIsaJ',
    },
  };
  try {
    const response = await axios.request(options);
    const data = response.data.list?.[0] || [];

    return data;
  } catch (error) {
    console.log('Failed to fetch order from nocodb ', error);
  }
};

export default fetchOrderFromNocoDbWithOrderId;
