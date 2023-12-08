// configure.tsx

import React, { useEffect, useState } from 'react';
import { Header } from './header.tsx';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faTrash, faUpload } from "@fortawesome/free-solid-svg-icons"


export const Configure: React.FC = () => {
  
  interface CategoryDef {
      id: number;
      category: string;
  };

  const [newCategory, setNewCategory] = useState('');
  const [categories, setCategories] = useState([{id:-1, category:''}]);

  
  const handleDelete = (id) => {
    console.log('del category: ', id);
    
    // Request we delete the category
    const ipcRenderer = (window as any).ipcRenderer;
    ipcRenderer.send('del_category', id);

    // Query new data
  };

  const handleSubmit = (e) => {
    e.preventDefault();  
    if (newCategory) {
      const data = newCategory;  
      console.log('new category: ', data);
        
      // Request we add the new category
      const ipcRenderer = (window as any).ipcRenderer;
      ipcRenderer.send('add_category', data);

      // Reset the label in the new category
      //setNewCategory('');
      
      // Query new data
    }
  };

  const newItemSection = (
    <form onSubmit={handleSubmit}>
        <label htmlFor="new-category">Enter a new category</label>
        <div className="new-category">
            <input
                type="text"
                id="new-category"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Enter new category"
            />
            <button className="submit">
                <FontAwesomeIcon icon={faUpload} />
            </button>
        </div>
    </form>
  );

  let content;
  if (categories) {
    content = categories.map((category) => {
      return (
        <article key={category.id}>
          <div className="category">
            <label>{category.category}</label>
            <button className="trash" onClick={() => handleDelete( category.id )}>
                <FontAwesomeIcon icon={faTrash} />
            </button>
          </div>
        </article>
      );
    });
  }

  useEffect(() => {
    const ipcRenderer = (window as any).ipcRenderer;
    
    // Signal we want to get data
    console.log('Calling main:get_data');
    ipcRenderer.send('get_data', 'category_list');
    
    // Receive the data
    ipcRenderer.on('list_data', (arg: CategoryDef[]) => {
      console.log('renderer: list_data2');
      console.log('arg:' + arg);
      setCategories(arg);

      ipcRenderer.removeAllListeners('list_data');
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
        
        {newItemSection}
        
        {content}
      </div>
    </div>
  );
};
