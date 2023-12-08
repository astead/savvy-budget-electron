// configure.tsx

import React, { useEffect, useState } from 'react';
import { Header } from './header.tsx';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import  * as yup from 'yup';
import { channels } from '../shared/constants';
//const { ipcRenderer } = window.require('electron');


export const Configure: React.FC = () => {
  
  interface CategoryDef {
      id: number;
      category: string;
  };

  const initialValues: CategoryDef = {
    id: 0,
    category: ''
  };

  //const [iter, setIter] = React.useState(0);
  //const [loaded, setLoaded] = React.useState(false);

  function set_data(data : CategoryDef[]) {
    //console.log('----------' + iter + '----------');
    console.log('Got list of categories:');
    console.log('data:', ...data);
    //setIter(iter+1);
    console.log('--------------------');
  };

  const onSubmit = (values: CategoryDef) => {
      console.log('values: ', values);
      const ipcRenderer = (window as any).ipcRenderer;
      ipcRenderer.send('submit:todoForm', values);
  };

  const validationSchema = yup.object().shape({
    category: yup.string().required(' Required'),
  });


  useEffect(() => {
    //const electron = (window as any).electron;
    const ipcRenderer = (window as any).ipcRenderer;
    
    //if (!loaded) {
    //  setLoaded(true);
      console.log('Calling main:get_data');
      ipcRenderer.send('get_data', { table: 'category' });
    //}
    
    ipcRenderer.on('list_data', (arg: CategoryDef[]) => {
      console.log('renderer: list_data2');
      //console.log('arg:' + arg);
      ipcRenderer.removeAllListeners('list_data');
      set_data(arg);
    });

    // Clean the listener after the component is dismounted
    return () => {
      ipcRenderer.removeAllListeners('list_data');
    };

  }, []);


  return (
    <div className="App">
      <header className="App-header">
        {<Header />}
      </header>
      <div>
        Configure<br/>
        
        <br/>
        <Formik initialValues={initialValues} onSubmit={onSubmit} validationSchema={validationSchema}>
          <Form>
              <div>
              <Field name='category' />
              <ErrorMessage name='category' />
              </div>
              <button type="submit">Save</button>
          </Form>
        </Formik>
      </div>
    </div>
  );
};
