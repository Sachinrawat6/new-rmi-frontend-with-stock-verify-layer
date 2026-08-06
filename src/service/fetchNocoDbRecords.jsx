import axios from 'axios';

const fetchOrdersFromNocoDbWithSyncId = async (sync_id) => {
  const options = {
    method: 'GET',
    url: 'https://nocodb.qurvii.com/api/v2/tables/m9lzzdoc2x4zxun/records',
    params: {
      limit: '1000',
      where: `(sync_id,eq,${sync_id})~and(status,eq,pending)`,
      viewId: 'vwwsae9mswybppcm',
    },
    headers: {
      'xc-token': 'QXOzKHJ982NgA2AIc8jDqK0lC5CdWEcCwacCIsaJ',
    },
  };
  try {
    const response = await axios.request(options);
    return response.data.list || [];
  } catch (error) {
    console.log('Failed to fetch orders from nocodb ', error);
  }
};

export default fetchOrdersFromNocoDbWithSyncId;
