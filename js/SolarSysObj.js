// Using ECMAScript 6!
class SolarSysObj extends THREE.Group {
    //radius param is expressed in Earth Radius units!
    constructor( name, geometry, material ) {
        super();
        this.mesh = new THREE.Mesh( geometry, material );
        this.add( this.mesh );
        if ( this instanceof OrbitingObj ) {
            super.castShadow = true; //default is false
        }
        this.name = name;
        this.color = material.color;
        if ( material.map ) {
            material.color = new THREE.Color( 1.0, 1.0, 1.0 );
            material.needsUpdate = true;
        }
    }

    setScale( scale = 1.0 ) {
        this.mesh.scale.set( scale, scale, scale );
    }

    getScale() {
        return this.mesh.scale.x;
    }
}