class ArtificialObj extends OrbitingObj {
    constructor( { model, modelOffset = null, geometryScale = null, scale, baseColor }, orbitsAround ) {
        super( new THREE.Geometry(), new THREE.MeshPhongMaterial( { color : baseColor } ), arguments[ 0 ],
               orbitsAround );
        let that = this;
        let mesh = this.mesh;
        new THREE.JSONLoader().load(
            model,
            function ( geometry ) {
                mesh.geometry = geometry;
                if ( modelOffset ) {
                    mesh.geometry.translate( modelOffset[ 0 ], modelOffset[ 1 ], modelOffset[ 2 ] );
                }
                if ( geometryScale ) {
                    mesh.geometry.scale( geometryScale[ 0 ], geometryScale[ 1 ], geometryScale[ 2 ] );
                }
                mesh.geometry.needsUpdate = true;
                mesh.geometry.computeBoundingSphere();
                that.radius = mesh.geometry.boundingSphere.radius;
            }
        );
    }
}