class Star extends SolarSysObj {
    constructor( { name, baseColor, radius } ) {
        super( name,
               new THREE.SphereGeometry( radius * KM, SEGMENTS, SEGMENTS ),
               new THREE.MeshBasicMaterial( { color : baseColor, transparent : true, depthWrite : false } ) );
        this.radius = radius * KM;
        this.orbitsAround = null;

        // Light
        this.light = new THREE.PointLight( { color : 'white', decay : 2 } );
        this.light.intensity = 3;
        this.light.position.copy( this.position );

        //Setting up shadow properties for the light
        this.light.shadow.mapSize.width = TEXTURE_SIZE;
        this.light.shadow.mapSize.height = TEXTURE_SIZE;
        this.light.shadow.camera.near = NEAR;
        this.light.shadow.camera.far = FAR;
        this.add( this.light );

        // Corona (note: magic numbers were calculated "empirically")
        let coronaMaterial = new THREE.SpriteMaterial( {
                                                              map : textureLoader.load( "./textures/lensFlare00.png" ),
                                                              color : 0xFFFFFF,
                                                              transparent : true,
                                                              blending : THREE.AdditiveBlending
                                                          } );
        let coronaSprite = new THREE.Sprite( coronaMaterial );
        coronaSprite.center = new THREE.Vector2( 0.50525, 0.4825 );
        coronaSprite.rotation.y = 20;
        coronaSprite.scale.set( this.radius * 32, this.radius * 32, this.radius * 32 );
        this.mesh.add( coronaSprite );
    }
}