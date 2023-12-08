// db/db.js

const path = require('path');
const { ipcRenderer, contextBridge, ipcMain } = require('electron');

const dbPath = path.resolve(__dirname, 'db/db.sqlite');

// Create connection to SQLite database
const knex = require('knex')({
    client: 'sqlite3',
    connection: {
        filename: dbPath,
    },
    useNullAsDefault: true
});

function setup_db() {
    // Create a table in the database called "books"
    knex.schema
        // Make sure no "books" table exists
        // before trying to create new
        .hasTable('category')
            .then((exists) => {
                if (!exists) {
                    return knex.schema.createTable('category', (table)  => {
                        table.increments('id').primary()
                        table.integer('category')
                    })
                    .then(() => {
                        // Log success message
                        console.log('Table \'Category\' created')
                    })
                    .catch((error) => {
                        console.error(`There was an error creating table: ${error}`)
                    })
                }
            })
            .then(() => {
                console.log('done')
            })
            .catch((error) => {
                console.error(`There was an error setting up the database: ${error}`)
            })
}

function query_category() {

    knex.select('*').from('category')
        .then(data => {
            console.log('data:', data);
            ipcRenderer.send('categories', data);
            ipcMain.send('categories', data);
        })
        .catch(err => console.log(err))
}

// Export the database
module.exports = knex;