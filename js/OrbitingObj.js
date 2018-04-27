const Y_AXIS = new THREE.Vector3( 0, 1, 0 );

class OrbitingObj extends SolarSysObj {
    //orbitRadius param is expressed in UA (1 UA = mean distance of the Earth from the Sun)
    constructor( geometry, material, { name, orbit, tilt = 0, syncMap = false }, orbitsAround ) {
        super( name, geometry, material );
        this.orbitsAround = orbitsAround;
        this.orbit = orbit;
        // Bigger orbit means more segments to make its line (approx.) "smooth"
        const SEGMENTS_FACTOR = ( this.position.distanceTo( this.orbitsAround.position ) / AU );
        this.orbit.segments = THREE.Math.clamp( ORBIT_SEGMENTS * SEGMENTS_FACTOR, ORBIT_SEGMENTS, 20000 );
        this.tilt = -tilt * THREE.Math.DEG2RAD;
        this.syncMap = syncMap;
        this.objectAvailableListener = null;
    }

    updatePosition( time ) {
        //position relative to orbitsAround
        this.position.copy( this.orbitsAround.position );
        this.position.add( OrbitUtils.calculateObjectPosition( time, this ) );
    }

    updateRotation( time ) {
        if ( !this.hasOwnProperty( "rotationPeriod" ) || this.rotationPeriod === 0 ) { return; }

        if ( this.syncMap ) {
            this.updateMatrixWorld();
            this.orbitsAround.updateMatrixWorld();
            let orbitsAround_local = this.worldToLocal( this.orbitsAround.position.clone() );
            orbitsAround_local.applyAxisAngle( Y_AXIS, -Math.PI / 2 );
            this.mesh.lookAt( orbitsAround_local );
            if ( this.rotationPeriod === null ) {
                this.mesh.rotation.z += this.tilt; //lookAt changes the rotation.z value, so we must only sum the
                                                   // tiltAngle
            } else {
                let t = ( time.getUTCHours() * 3600 + time.getUTCMinutes() * 60 + time.getUTCSeconds() ) - 43200;
                let p = this.rotationPeriod * SECONDS_IN_DAY;
                this.mesh.rotation.x += this.tilt;
                this.mesh.rotation.y += ( 2 * Math.PI ) * ( t / p );
            }
        } else {
            let rotation = ( ( time.getTime() - J2000 ) / ( 1000 * SECONDS_IN_DAY ) ) / this.rotationPeriod;
            this.mesh.rotation.x = this.tilt;
            this.mesh.rotation.y = ( 2 * Math.PI ) * ( rotation );
        }
    }

    updateObjLabel( container, camera ) {
        if ( !this.label ) {
            this.label = createTextLabel( this.name, "#" + this.color.getHexString() );
            container.appendChild( this.label );
        }
        let labelCoordinates = getScreenPosition( this, camera, this.radius * this.getScale() );
        if ( labelCoordinates ) {
            if ( this.name === "Moon" ) { //avoiding Moon label overlapping Earth's one!
                labelCoordinates.x += 30;
            }
            if ( this.name === "Hubble" ) {
                labelCoordinates.y += 10;
            }
            labelCoordinates.y -= this.label.clientHeight;// / 2;
            labelCoordinates.x -= this.label.clientWidth / 2;
            const alpha = 1 / labelCoordinates.z;
            this.label.style.transform = "translate(" + labelCoordinates.x + "px, " + labelCoordinates.y + "px) " +
                "scale(" + labelCoordinates.z + ")";
            this.label.style.opacity = alpha.toString();
            this.label.style.display = "";
        } else {
            this.label.style.display = "none";
        }
    }

    updateOrbitLine( endTime, redraw = false ) {
        let timeDelta = OrbitUtils.calculateOrbitalPeriod( endTime, this ) / this.orbit.segments;
        if ( !this.orbit.line || redraw ) {
            this.orbit.geometry = new THREE.Geometry();
            let time = new Date( endTime.getTime() );
            for ( let i = 0; i < this.orbit.segments; ++i ) {
                this.orbit.geometry.vertices.unshift( OrbitUtils.calculateObjectPosition( time, this ) );
                time = time.subDays( timeDelta );
            }
            this.orbit.meshLine = new MeshLine();
            this.orbit.meshLine.setGeometry( this.orbit.geometry, function ( p ) {
                return 4 * p;
            } );
            let orbitMaterial = new MeshLineMaterial( {
                                                          resolution : new THREE.Vector2( width, height ),
                                                          color : this.color,
                                                          linewidth : 2,
                                                          sizeAttenuation : false,
                                                          near : NEAR,
                                                          far : FAR,
                                                          //depthFunc       : THREE.LessEqualDepth,
                                                          depthTest : true,
                                                          depthWrite : true,
                                                          side : THREE.DoubleSide
                                                      } );
            this.orbit.line = new THREE.Mesh( this.orbit.meshLine.geometry, orbitMaterial );
            this.orbit.line.position.copy( this.orbitsAround.position );
            // last time a complete segment (of timeDelta days) was added to the orbit
            this.orbit.lastSegmentTime = new Date( endTime.getTime() );
            this.orbit.lastDrawTime = new Date( endTime.getTime() );
        } else {
            this.orbit.line.position.copy( this.orbitsAround.position );

            let nextSegmentTime = this.orbit.lastSegmentTime.addDays( timeDelta );

            if ( this.orbit.lastDrawTime.getTime() > this.orbit.lastSegmentTime.getTime() ) {
                let time = ( endTime.getTime() <= nextSegmentTime.getTime() ) ? endTime : nextSegmentTime;
                this.orbit.meshLine.advanceUpdate( OrbitUtils.calculateObjectPosition( time, this ) );
                if ( endTime.getTime() === nextSegmentTime.getTime() ) {
                    nextSegmentTime = nextSegmentTime.addDays( timeDelta );
                    this.orbit.lastSegmentTime = endTime;
                }
            }

            while ( endTime.getTime() >= nextSegmentTime.getTime() ) {
                this.orbit.meshLine.advance( OrbitUtils.calculateObjectPosition( nextSegmentTime, this ) );
                this.orbit.lastSegmentTime = nextSegmentTime;
                nextSegmentTime = nextSegmentTime.addDays( timeDelta );
                if ( endTime.getTime() < nextSegmentTime.getTime() ) {
                    this.orbit.meshLine.advance( OrbitUtils.calculateObjectPosition( endTime, this ) );
                }
            }

            this.orbit.lastDrawTime = new Date( endTime.getTime() );
        }
    }

    setVisible( visible, displayOrbits = visible ) {
        if ( this.visible !== visible ) {
            super.setVisible( visible );
        }
        // two cases: visible is true, then we must change orbit visibility if it is different than displayOrbits,
        //            or visible is false and then we must hide the orbit only if not already hidden!
        displayOrbits = visible && displayOrbits;
        if ( this.orbit.line.visible !== displayOrbits ) {
            this.orbit.line.setVisible( displayOrbits );
        }
    }

    isAvailable( time ) {
        return !this.orbit.hasOwnProperty( "afterEpoch" ) ||
            OrbitUtils.getJDFromUnix( time.getTime() ) >= this.orbit.epoch;
    }
}