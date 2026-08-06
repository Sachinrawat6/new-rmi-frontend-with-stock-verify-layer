import React, { useEffect } from 'react';
import fetchOrdersFromNocoDbWithSyncId from '../service/fetchNocoDbRecords';

const Test = () => {
  const fetch = async () => {
    const response = await fetchOrdersFromNocoDbWithSyncId(11247);
    console.log('Response', response);
  };
  useEffect(() => {
    fetch();
  }, []);
  return <div>test</div>;
};

export default Test;
