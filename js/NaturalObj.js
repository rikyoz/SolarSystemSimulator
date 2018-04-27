class NaturalObj extends OrbitingObj {
    constructor( { radius, baseColor, rotationPeriod = 0, ellipsoidParams = null, rings = null },
                 textures, orbitsAround ) {
        let material_options = {
            color : baseColor,
            map : textureLoader.load( textures.surface ),
            depthFunc : THREE.LessEqualDepth,
            depthTest : true,
            depthWrite : true,
            shininess : 0
        };
        if ( textures.hasOwnProperty( "normal" ) ) {
            material_options.normalMap = textureLoader.load( textures.normal );
            material_options.normalScale = new THREE.Vector2( 0.25, 0.25 );
        }
        if ( textures.hasOwnProperty( "specular" ) ) {
            material_options.specularMap = textureLoader.load( textures.specular );
            material_options.specular = 0x555555;
            material_options.shininess = 20;
        }
        if ( textures.hasOwnProperty( "bump" ) ) {
            material_options.bumpMap = textureLoader.load( textures.bump );
            material_options.bumpScale = 1.0;
        }
        super( new THREE.SphereGeometry( radius * KM, SEGMENTS, SEGMENTS ),
               new THREE.MeshPhongMaterial( material_options ),
               arguments[ 0 ], orbitsAround );
        this.radius = this.mesh.geometry.parameters.radius;
        this.rotationPeriod = rotationPeriod;

        if ( ellipsoidParams ) {
            let width = 2 * radius;
            this.mesh.geometry.applyMatrix(
                new THREE.Matrix4().makeScale( 1.0, ellipsoidParams.height / width, ellipsoidParams.depth / width )
            );
        }
        if ( textures.hasOwnProperty( "atmosphere" ) ) {
            this.mesh.add( new THREE.Mesh( this.mesh.geometry.clone(),
                                           new THREE.MeshLambertMaterial( {
                                                                              map : textureLoader.load( textures.atmosphere ),
                                                                              transparent : true,
                                                                              depthFunc : THREE.LessEqualDepth,
                                                                              depthTest : true,
                                                                              depthWrite : true,
                                                                          } ) ) );
        }
    }
}