class PlanetRings extends THREE.Mesh {
    constructor( { innerRadius, outerRadius }, texture ) {
        super( new THREE.XRingGeometry( innerRadius * KM, outerRadius * KM, 2 * SEGMENTS, 2 * SEGMENTS ),
               new THREE.MeshBasicMaterial( {
                                                map : textureLoader.load( texture ),
                                                side : THREE.DoubleSide,
                                                transparent : true,
                                                opacity : 0.5,
                                                depthWrite : false
                                            } ) );
        // Shadow on rings doesn't work, probably because of three.js/webgl problems in handling
        // the huge distance from the light source to Saturn.

        //this.castShadow = true;
        //this.receiveShadow = true;

        /*let shadowGeometry = this.geometry.clone();
         let shadowMaterial = new THREE.ShadowMaterial( { side : THREE.DoubleSide, opacity : 1.0 } );
         this.shadow = new THREE.Mesh( shadowGeometry, shadowMaterial );
         this.shadow.castShadow = false;
         this.shadow.receiveShadow = true;
         this.add( this.shadow );*/
    }
}