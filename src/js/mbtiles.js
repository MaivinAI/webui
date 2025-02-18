// Only declare if not already defined
if (typeof window.MBTilesReader === 'undefined') {
    class MBTilesReader {
        constructor(arrayBuffer) {
            this.data = arrayBuffer;
            this.db = null;
            this.metadata = null;
        }

        async open() {
            try {
                // Initialize SQL.js
                const SQL = await initSqlJs({
                    locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
                });

                // Initialize database
                this.db = new SQL.Database(new Uint8Array(this.data));

                // Load metadata
                await this.loadMetadata();
            } catch (error) {
                console.error('Error initializing SQL.js:', error);
                throw error;
            }
        }

        async loadMetadata() {
            try {
                const result = this.db.exec("SELECT name, value FROM metadata");
                if (result.length > 0) {
                    this.metadata = result[0].values.reduce((obj, [key, value]) => {
                        obj[key] = value;
                        return obj;
                    }, {});
                }
            } catch (error) {
                console.error('Error loading metadata:', error);
                throw error;
            }
        }

        async getMetadata() {
            return this.metadata;
        }

        async getTile(z, x, y) {
            try {
                const stmt = this.db.prepare(
                    "SELECT tile_data FROM tiles WHERE zoom_level = ? AND tile_column = ? AND tile_row = ?"
                );
                stmt.bind([z, x, y]);

                const result = stmt.step();
                if (result) {
                    const tileData = stmt.get()[0];
                    stmt.free();
                    return tileData;
                }
                stmt.free();
                return null;
            } catch (error) {
                console.error('Error getting tile:', error);
                throw error;
            }
        }

        close() {
            if (this.db) {
                this.db.close();
            }
        }
    }

    // Make it globally available
    window.MBTilesReader = MBTilesReader;
}