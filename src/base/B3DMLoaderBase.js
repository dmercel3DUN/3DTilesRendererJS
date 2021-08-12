// B3DM File Format
// https://github.com/CesiumGS/3d-tiles/blob/master/specification/TileFormats/Batched3DModel/README.md

import { FeatureTable, BatchTable } from '../utilities/FeatureTable.js';

//Importing fflate tool for Gzip
const fflate = require( 'fflate' );

export class B3DMLoaderBase {

	constructor() {

		this.fetchOptions = {};
		this.workingPath = '';

	}

	load( url ) {

		return fetch( url, this.fetchOptions )
			.then( res => {

				if ( ! res.ok ) {

					throw new Error( `Failed to load file "${ url }" with status ${ res.status } : ${ res.statusText }` );

				}
				return res.arrayBuffer();

			} )
			.then( buffer => {

				if ( this.workingPath === '' ) {

					const splits = url.split( /\\\//g );
					splits.pop();
					this.workingPath = splits.join( '/' );

				}

				return this.parse( buffer );

			} );

	}

	parse( buffer ) {

		// TODO: this should be able to take a uint8array with an offset and length
		var dataView = new DataView( buffer );
		//console.log( dataView );

		//Test to see if file is gzipped Magic number is '1F8B08' is equivalent to 31 / 139 / 8 = 178
		const tmagic =
			dataView.getUint8( 0 ) +
			dataView.getUint8( 1 ) +
			dataView.getUint8( 2 );

		//console.log( dataView.getUint8( 0 ) );
		//console.log( ( dataView.getUint8( 0 ) ).toString( 16 ).toUpperCase() );
		//console.log( dataView.getUint8( 1 ) );
		//console.log( ( dataView.getUint8( 1 ) ).toString( 16 ).toUpperCase() );
		//console.log( dataView.getUint8( 2 ) );
		//console.log( ( dataView.getUint8( 2 ) ).toString( 16 ).toUpperCase() );

		//console.log( tmagic );

		//console.assert( tmagic === 178 );

		if ( tmagic === 178 ) {

			//Process gzipped file
			const compressed = new Uint8Array( buffer );
			const decompressed = fflate.decompressSync( compressed );
			//console.log( decompressed );

			//View decompressed magic number
			const dataView2 = new DataView( decompressed.buffer );
			//console.log( dataView2.getUint8( 0 ) );
			//console.log( dataView2.getUint8( 1 ) );
			//console.log( dataView2.getUint8( 2 ) );
			//console.log( dataView2.getUint8( 3 ) );

			dataView = dataView2;
			buffer = decompressed.buffer;

		}


		// 28-byte header

		// 4 bytes
		const magic =
			String.fromCharCode( dataView.getUint8( 0 ) ) +
			String.fromCharCode( dataView.getUint8( 1 ) ) +
			String.fromCharCode( dataView.getUint8( 2 ) ) +
			String.fromCharCode( dataView.getUint8( 3 ) );

		//console.log( dataView.getUint8( 0 ) );
		//console.log( dataView.getUint8( 1 ) );
		//console.log( dataView.getUint8( 2 ) );
		//console.log( dataView.getUint8( 3 ) );
		//console.log( magic );
		console.assert( magic === 'b3dm' );

		// 4 bytes
		const version = dataView.getUint32( 4, true );

		//console.log( version );
		console.assert( version === 1 );

		// 4 bytes
		const byteLength = dataView.getUint32( 8, true );

		//console.log( byteLength );
		console.assert( byteLength === buffer.byteLength );

		// 4 bytes
		const featureTableJSONByteLength = dataView.getUint32( 12, true );

		// 4 bytes
		const featureTableBinaryByteLength = dataView.getUint32( 16, true );

		// 4 bytes
		const batchTableJSONByteLength = dataView.getUint32( 20, true );

		// 4 bytes
		const batchTableBinaryByteLength = dataView.getUint32( 24, true );

		// Feature Table
		const featureTableStart = 28;
		const featureTableBuffer = buffer.slice(
			featureTableStart,
			featureTableStart + featureTableJSONByteLength + featureTableBinaryByteLength,
		);
		const featureTable = new FeatureTable(
			featureTableBuffer,
			0,
			featureTableJSONByteLength,
			featureTableBinaryByteLength,
		);

		// Batch Table
		const batchTableStart = featureTableStart + featureTableJSONByteLength + featureTableBinaryByteLength;
		const batchTableBuffer = buffer.slice(
			batchTableStart,
			batchTableStart + batchTableJSONByteLength + batchTableBinaryByteLength,
		);
		const batchTable = new BatchTable(
			batchTableBuffer,
			featureTable.getData( 'BATCH_LENGTH' ),
			0,
			batchTableJSONByteLength,
			batchTableBinaryByteLength,
		);

		const glbStart = batchTableStart + batchTableJSONByteLength + batchTableBinaryByteLength;
		const glbBytes = new Uint8Array( buffer, glbStart, byteLength - glbStart );

		return {
			version,
			featureTable,
			batchTable,
			glbBytes,
		};

	}

}

