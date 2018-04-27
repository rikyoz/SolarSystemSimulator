'use strict'; // see strict mode

// OBJ CONSTANTS
const SEGMENTS = 64;
const ORBIT_SEGMENTS = 720;
const TEXTURE_SIZE = 1024;//2048;

const textureLoader = new THREE.TextureLoader();

Date.prototype.addDays = function ( days ) {
    return new Date( this.getTime() + parseFloat( days ) * 24 * 60 * 60 * 1000 );
};

Date.prototype.subDays = function ( days ) {
    return new Date( this.getTime() - parseFloat( days ) * 24 * 60 * 60 * 1000 );
};

THREE.Object3D.prototype.setVisible = function ( visible ) {
    this.traverse( function ( child ) {
        if ( child instanceof THREE.Mesh || child instanceof THREE.Points ) {
            child.visible = visible;
        }
    } );
    this.visible = visible;
};

function gaussianRandom() { //gaussian random number in (-0.5, 0.5)
    return -0.5 + Math.sqrt( -2 * Math.log( Math.random() ) ) * Math.cos( ( 2 * Math.PI ) * Math.random() );
}

MeshLine.prototype.advanceUpdate = function ( position ) {
    let positions = this.attributes.position.array;
    let next = this.attributes.next.array;
    let l = positions.length;

    positions[ l - 6 ] = position.x;
    positions[ l - 5 ] = position.y;
    positions[ l - 4 ] = position.z;
    positions[ l - 3 ] = position.x;
    positions[ l - 2 ] = position.y;
    positions[ l - 1 ] = position.z;

    next[ l - 6 ] = position.x;
    next[ l - 5 ] = position.y;
    next[ l - 4 ] = position.z;
    next[ l - 3 ] = position.x;
    next[ l - 2 ] = position.y;
    next[ l - 1 ] = position.z;

    this.attributes.position.needsUpdate = true;
    this.attributes.next.needsUpdate = true;
};

function getScreenPosition( obj, camera, offsetY = 0 ) {
    if ( !obj.visible ) {
        return null;
    }

    let vector = new THREE.Vector3();

    let widthHalf = 0.5 * width;
    let heightHalf = 0.5 * height;

    obj.updateMatrixWorld();
    vector.setFromMatrixPosition( obj.matrixWorld );
    vector.y += offsetY;
    vector.project( camera );

    vector.x = ( vector.x * widthHalf ) + widthHalf;
    vector.y = -( vector.y * heightHalf ) + heightHalf;

    if ( vector.z < 1 && vector.x > 0 && vector.x < width && vector.y > 0 && vector.y < height ) {
        const distance = camera.position.distanceTo( obj.position );
        const span = Math.atan( VIEW_ANGLE / 2 ) * distance;
        const factor = 1 / ( 1 + Math.log10( span ) );
        vector.z = 0.75 + factor;
        return vector;
    }
    return null;
}

function createTextLabel( text, color ) {
    let div = document.createElement( 'div' );
    div.className = 'object-label';
    div.style.color = color;
    div.style.display = "";
    div.innerHTML = text;
    return div;
}

function parseSolarSystemData( data, textures, parent = null ) {
    let result = {};
    let name = data[ "name" ].toLowerCase();
    if ( data.radius ) {
        result[ name ] = ( parent === null ) ? new Star( data ) : new NaturalObj( data, textures[ name ], parent );
    } else if ( name === "rings" ) {
        parent.rings = new PlanetRings( data, textures[ parent.name.toLowerCase() ].rings );
        parent.mesh.add( parent.rings ); //assuming parent != null
    } else if ( name === "asteroid_belt" ) {
        result[ name ] = new AsteroidBelt( data, parent );
    } else {
        result[ name ] = new ArtificialObj( data, parent );
    }
    if ( data.hasOwnProperty( "orbitingObjects" ) ) {
        for ( let orbitingObj of data[ "orbitingObjects" ] ) {
            Object.assign( result, parseSolarSystemData( orbitingObj, textures, result[ name ] ) );
        }
    }
    return result;
}