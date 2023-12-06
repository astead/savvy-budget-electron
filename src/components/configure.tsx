// configure.tsx

import React, { useState } from 'react';
import { Header } from './header.tsx';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import  * as yup from 'yup';


interface IValue {
  description: string;
}




export const Configure: React.FC = () => {
 
  

  //const electron = (window as any).electron;
  const ipcRenderer = (window as any).ipcRenderer;

  const initialValues: IValue = {
      description: ''
  }

  const onSubmit = (values: IValue) => {
      console.log('values: ', values);
      ipcRenderer.send('submit:todoForm', values);

      

  };

  const validationSchema = yup.object().shape({
    description: yup.string().required(' Required'),
  });

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
              <Field name='description' />
              <ErrorMessage name='description' />
              </div>
              <button type="submit">Save</button>
          </Form>
        </Formik>
      </div>
    </div>
  );
};
