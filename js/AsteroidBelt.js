class AsteroidBelt extends THREE.Group {
    constructor( { baseColor, innerRadius, outerRadius }, orbitsAround ) {
        super();
        this.position.copy( orbitsAround.position );
        this.color = baseColor;
        this.innerRadius = innerRadius;
        this.outerRadius = outerRadius;
    }

    initialize() {
        let smallAsteroidsGeometry = [ new THREE.Geometry(), new THREE.Geometry() ];
        for ( let i = 0; i < 2500; i++ ) {
            let angle = THREE.Math.randFloat( 0, 2 * Math.PI );
            let distance = THREE.Math.randFloat( this.innerRadius, this.outerRadius ) * AU;
            let positionY = gaussianRandom() * ( AU / 4 );

            let index = i < 1250 ? 0 : 1;
            smallAsteroidsGeometry[ index ].vertices.push(
                new THREE.Vector3( Math.cos( angle ) * distance, positionY, Math.sin( angle ) * distance )
            );
        }
        let smallAsteroidsMaterial = [
            new THREE.PointsMaterial( {
                                          color : this.color,
                                          //lights : true,
                                          size : 1.125
                                      } ),
            new THREE.PointsMaterial( {
                                          color : this.color,
                                          //lights : true,
                                          size : 1.5
                                      } ),
        ];
        this.add( new THREE.Points( smallAsteroidsGeometry[ 0 ], smallAsteroidsMaterial[ 0 ] ) );
        this.add( new THREE.Points( smallAsteroidsGeometry[ 1 ], smallAsteroidsMaterial[ 1 ] ) );

        let asteroidMaterial = new THREE.MeshLambertMaterial( { color : this.color } );
        for ( let i = 0; i < 100; i++ ) {
            let size = THREE.Math.randFloat( 10, 240 );
            let shape1 = THREE.Math.randFloat( 4, 10 );
            let shape2 = THREE.Math.randFloat( 4, 10 );
            let distance = THREE.Math.randFloat( this.innerRadius, this.outerRadius ) * AU;
            let positionY = gaussianRandom() * ( AU / 4 );

            let asteroid = new THREE.Mesh( new THREE.SphereGeometry( size, shape1, shape2 ),
                                           asteroidMaterial );

            asteroid.position.y = positionY;
            let orbitDistance = THREE.Math.randFloat( 0, 2 * Math.PI );
            asteroid.position.x = Math.cos( orbitDistance ) * distance;
            asteroid.position.z = Math.sin( orbitDistance ) * distance;

            this.add( asteroid );
        }
    }

    setVisible( visible ) {
        if ( this.visible !== visible ) {
            super.setVisible( visible );
        }
    }
}