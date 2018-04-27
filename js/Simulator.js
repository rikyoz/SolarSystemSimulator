'use strict'; // see strict mode
// VIEWPORT CONSTANTS (accurate viewport dimensions)
let width = Math.max( document.documentElement.clientWidth, window.innerWidth || 0 );
let height = Math.max( document.documentElement.clientHeight, window.innerHeight || 0 );

// CAMERA CONSTANTS
const VIEW_ANGLE = 45;
const NEAR = 0.1;
const FAR = 100000000000;

// SIMULATION CONSTANTS
const DEFAULT_SIZE_SCALE = 10; //default size scale of 1 Earth radius

const Simulator = ( function () {
    const BG_SPHERE_RADIUS = FAR * 100;

    let renderer = new THREE.WebGLRenderer( {
                                                antialias : true,
                                                logarithmicDepthBuffer : true,
                                                preserveDrawingBuffer : true,
                                                alpha : true
                                            } );
    let universe = new THREE.Scene();
    let camera = new THREE.PerspectiveCamera(
        VIEW_ANGLE,      // Field of view
        width / height,  // Aspect ratio
        NEAR,            // Near
        FAR              // Far
    );
    let controls = new THREE.OrbitControls( camera, renderer.domElement );
    let stats = new Stats();

    let orbitingObjects = [];
    let targetObj = null;
    let starField1 = null;
    let starField2 = null;
    let habitableZone = false;
    let orbitsVisible = true;
    let labelsVisible = true;
    let followTarget = true;
    let lookingFrom = false;

    let currentDateTime = null;
    let simulating = false;
    let staticUpdate = false;
    let speedFactor = 1;
    let speedIndex = 0;
    let clock = new THREE.Clock( false );
    let onSimulationUpdatedCallback;
    let onSimulationStopCallback;

    let loadJSON = function ( url, callback ) {
        $.getJSON( url, function ( data ) {
            console.log( "File '" + url + "' loaded with success! Parsing..." );
            callback( data );
        } ).fail( function ( d, textStatus, error ) {
            console.log( "Error while loading data! Status: \"" + textStatus + "\", error: \"" + error );
        } );
    };

    let detectPixelRatio = function () {
        let devicePixelRatio = window.devicePixelRatio || 1;
        return devicePixelRatio < 1 ? devicePixelRatio : 2;
    };

    let updateLabels = function () {
        for ( let sys_obj of Object.values( orbitingObjects ) ) {
            if ( sys_obj.visible ) {
                sys_obj.updateObjLabel( document.body, camera );
            }
        }
    };

    let updateOrbitingObjects = function () {
        for ( let sys_obj of Object.values( orbitingObjects ) ) {
            if ( !sys_obj.visible && ( !sys_obj.objectAvailableListener || !sys_obj.isAvailable( currentDateTime ) ) ) {
                continue;
            }

            if ( !sys_obj.isAvailable( currentDateTime ) ) {
                console.log( "hidden " + sys_obj.name );
                sys_obj.setVisible( false, false );
                sys_obj.label.style.display = "none";
                sys_obj.objectAvailableListener = function () {
                    console.log( "tesla is available!" );
                    sys_obj.setVisible( true, orbitsVisible );
                    sys_obj.label.style.display = labelsVisible ? "" : "none";
                };
                continue;
            }

            let redraw = staticUpdate;
            if ( sys_obj.objectAvailableListener ) {
                redraw = true;
                sys_obj.objectAvailableListener();
                sys_obj.objectAvailableListener = null;
            }

            sys_obj.updatePosition( currentDateTime );
            sys_obj.updateRotation( currentDateTime );
            if ( sys_obj.orbit.line.visible ) {
                if ( redraw ) {
                    universe.remove( sys_obj.orbit.line );
                }
                sys_obj.updateOrbitLine( currentDateTime, redraw );
                if ( redraw ) {
                    universe.add( sys_obj.orbit.line );
                }
            }

        }
        if ( lookingFrom ) {
            updateCameraPosition();
        }
    };

    let updateCameraPosition = function ( position = null ) {
        if ( !position ) {
            //calculating a good position from which to look at the object
            targetObj.updateMatrixWorld();
            position =
                targetObj.worldToLocal( lookingFrom ? targetObj.orbitsAround.position.clone() : new THREE.Vector3() );
            position.setLength( targetObj.radius * targetObj.getScale() * 4 );
            if ( !followTarget || lookingFrom ) {
                position = targetObj.localToWorld( position );
            }
        }
        camera.position.copy( position );
    };

    let lookAt = function ( object, from = null ) {
        //console.log( "[lookAt] followTarget: " + followTarget + ", lookingFrom: " + lookingFrom );
        targetObj = object;
        let targetPosition;
        if ( followTarget && !lookingFrom ) {
            targetObj.add( camera );
            targetPosition = new THREE.Vector3();
        } else {
            universe.add( camera );
            targetPosition = targetObj.position;
        }
        camera.lookAt( targetPosition );
        controls.target = targetPosition;
        controls.minDistance = targetObj.radius * targetObj.getScale() * 3;
        updateCameraPosition( from );
    };

    return {
        loadObjectsData : function ( url, textures, callback ) {
            loadJSON( url, function ( json ) {
                let minYear = json[ "dataValidityRange" ][ 0 ];
                let maxYear = json[ "dataValidityRange" ][ 1 ];
                callback( parseSolarSystemData( json, textures ), minYear, maxYear );
            } );
        },
        loadTextures : function ( url, callback ) {
            loadJSON( url, function ( json ) {
                callback( json );
            } );
        },
        initialize : function ( solarSystem, targetName, maxDistance, maxYear ) {
            targetObj = solarSystem[ targetName ];

            stats.showPanel( 0 ); // fps counter
            stats.domElement.style.position = "absolute";
            stats.domElement.style.left = "0";
            stats.domElement.style.bottom = "0";
            document.body.appendChild( stats.domElement );

            // initializing renderer
            renderer.setPixelRatio( detectPixelRatio() );
            renderer.physicallyCorrectLights = true;
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            renderer.setClearColor( 0x000000, 0.0 );
            renderer.setSize( width, height );
            document.body.appendChild( renderer.domElement );

            // initializing scene
            universe = new THREE.Scene();
            universe.add( new THREE.AmbientLight( 0x333333 ) );

            // initializing camera
            //camera.position.copy( init_camera_pos );
            //camera.up.set( 0, 0, 1 );
            camera.lookAt( universe.position );
            universe.add( camera );

            currentDateTime = new Date();//TEST_DATE;
            console.log( currentDateTime.toISOString() );

            // adding solar system objects
            for ( let sys_obj of Object.values( solarSystem ) ) {
                universe.add( sys_obj );
                if ( sys_obj instanceof OrbitingObj ) {
                    orbitingObjects.push( sys_obj );
                    sys_obj.updatePosition( currentDateTime );
                    sys_obj.updateRotation( currentDateTime );
                    sys_obj.updateOrbitLine( currentDateTime );
                    universe.add( sys_obj.orbit.line );
                } else if ( sys_obj instanceof AsteroidBelt ) {
                    sys_obj.initialize();
                }
            }

            // adding background stars
            let starsGeometry = [ new THREE.Geometry(), new THREE.Geometry() ];
            for ( let i = 0; i < 10000; i++ ) {
                let star = new THREE.Vector3();
                star.x = THREE.Math.randFloatSpread( BG_SPHERE_RADIUS );
                star.y = THREE.Math.randFloatSpread( BG_SPHERE_RADIUS );
                star.z = THREE.Math.randFloatSpread( BG_SPHERE_RADIUS );

                let index = ( i < 9000 ) ? 0 : 1;
                starsGeometry[ index ].vertices.push( star );
                let random = Math.random();
                starsGeometry[ index ].colors.push( new THREE.Color( random, random, random ) );
            }
            let starsMaterial = [
                new THREE.PointsMaterial( {
                                              color : 0x888888,
                                              sizeAttenuation : false,
                                              size : 1.125,
                                              vertexColors : THREE.VertexColors,
                                              depthWrite : false,
                                              blending : THREE.AdditiveBlending,
                                              transparent : true
                                          } ),
                new THREE.PointsMaterial( {
                                              color : 0xAAAAAA,
                                              sizeAttenuation : false,
                                              size : 1.5,
                                              vertexColors : THREE.VertexColors,
                                              depthWrite : false,
                                              blending : THREE.AdditiveBlending,
                                              transparent : true
                                          } ),
            ];
            starField1 = new THREE.Points( starsGeometry[ 0 ], starsMaterial[ 0 ] );
            starField2 = new THREE.Points( starsGeometry[ 1 ], starsMaterial[ 1 ] );
            universe.add( starField1 );
            universe.add( starField2 );

            // initializing controls
            controls.enableZoom = true;
            controls.enablePan = false;
            controls.enableKeys = true;
            controls.autoRotate = false;
            controls.maxDistance = maxDistance;
            //controls.enableDamping = true;
            //controls.dampingFactor = 0.25;
            /*controls.addEventListener( 'change', function() {
             if ( targetObj ) {
             let distance = camera.position.distanceTo( targetObj.position );
             renderer.logarithmicDepthBuffer = ( distance > 8000000 );
             console.log( renderer.logarithmicDepthBuffer );
             }
             } );*/

            renderer.render( universe, camera );
            requestAnimationFrame( function render() {
                stats.begin();
                if ( staticUpdate ) {
                    updateOrbitingObjects();
                    onSimulationUpdatedCallback( currentDateTime );
                    staticUpdate = false;
                } else if ( simulating ) {
                    let elapsedMilliseconds = 0;
                    if ( clock.running ) {
                        clock.stop();
                        elapsedMilliseconds = clock.getElapsedTime() * speedFactor * 1000;
                        currentDateTime.setMilliseconds( currentDateTime.getMilliseconds() + elapsedMilliseconds );
                    }
                    if ( elapsedMilliseconds > 0 ) {
                        if ( currentDateTime.getFullYear() > maxYear ) {
                            simulating = false;
                            onSimulationStopCallback(
                                "Available data is valid only in the year range [1800, 2050]. Simulation stopped." );
                        } else {
                            updateOrbitingObjects();
                            onSimulationUpdatedCallback( currentDateTime );
                        }
                    }
                    clock.start();
                }
                if ( labelsVisible ) {
                    updateLabels();
                }
                controls.update();
                renderer.render( universe, camera );
                stats.end();
                requestAnimationFrame( render );
            } );
        },
        setObjectsScale : function ( objects, scale ) {
            for ( let obj of Object.values( objects ) ) {
                if ( obj instanceof SolarSysObj ) {
                    obj.setScale( scale, scale, scale );
                }
            }
            if ( targetObj ) {
                controls.minDistance = targetObj.radius * 3 * scale;
                controls.update();
            }
        },
        setObjectsVisibility : function ( objects, visible ) {
            for ( let obj of objects ) {
                obj.setVisible( visible, orbitsVisible );
                if ( !(obj instanceof OrbitingObj) ) {
                    continue;
                }
                if ( visible ) {
                    obj.updatePosition( currentDateTime );
                    obj.updateRotation( currentDateTime );
                    universe.remove( obj.orbit.line );
                    obj.updateOrbitLine( currentDateTime, true );
                    universe.add( obj.orbit.line );
                }
                if ( labelsVisible ) {
                    obj.updateObjLabel( document.body, camera );
                }
            }
        },
        setStarsVisibility : function ( visible ) {
            if ( !visible ) {
                universe.remove( starField1 );
                universe.remove( starField2 );
            } else {
                universe.add( starField1 );
                universe.add( starField2 );
            }
        },
        setOrbitsVisibility : function ( objects, visible ) {
            for ( let obj of Object.values( objects ) ) {
                if ( obj.orbit && obj.visible ) {
                    obj.orbit.line.setVisible( visible );
                    if ( obj.orbit.lastDrawTime.getTime() !== currentDateTime.getTime() ) {
                        universe.remove( obj.orbit.line );
                        obj.updateOrbitLine( currentDateTime, true );
                        universe.add( obj.orbit.line );
                    }
                }
            }
            orbitsVisible = visible;
        },
        setLabelsVisibility : function ( objects, visible ) {
            labelsVisible = visible;
            for ( let obj of Object.values( objects ) ) {
                if ( obj.label && obj.visible ) {
                    obj.label.style.display = visible ? "" : "none";
                }
            }
        },
        setStatsVisibility : function ( visible ) {
            stats.domElement.style.display = visible ? "" : "none";
        },
        setHabitableZoneVisibility : function ( visible ) {
            if ( visible ) {
                let geometry = new THREE.RingGeometry( 0.75 * AU, 2.4 * AU, SEGMENTS, SEGMENTS );
                let material = new THREE.MeshBasicMaterial( {
                                                                color : 0x008000, side : THREE.DoubleSide,
                                                                transparent : true, opacity : 0.25,
                                                                depthTest : false
                                                            } );
                habitableZone = new THREE.Mesh( geometry, material );
                habitableZone.rotateX( Math.PI / 2 );
                universe.add( habitableZone );
            } else {
                universe.remove( habitableZone );
            }

        },
        setDebugVisibility : function ( objects, visible ) {
            for ( let obj of Object.values( objects ) ) {
                if ( !obj.mesh ) {
                    continue;
                }

                if ( !obj.axesHelper ) {
                    obj.axesHelper = new THREE.AxesHelper( obj.radius * 4 );
                }
                if ( visible ) {
                    obj.mesh.add( obj.axesHelper );
                } else {
                    obj.mesh.remove( obj.axesHelper );
                }
            }
        },
        setFollowTarget : function ( follow ) {
            followTarget = follow;
            if ( !( targetObj instanceof Star ) ) {
                lookAt( targetObj );
            }
        },
        startSimulation : function ( startDateTime = null ) {
            if ( startDateTime != null ) {
                currentDateTime = startDateTime;
            }
            simulating = true;
        },
        stopSimulation : function () {
            simulating = false;
            if ( clock.running ) {
                clock.stop();
            }
        },
        setSimulationDate : function ( dateTime ) {
            currentDateTime = dateTime;
            staticUpdate = true;
        },
        setSimulationSpeed : function ( speed, index ) {
            speedFactor = speed;
            speedIndex = index;
        },
        onSimulationUpdated : function ( callback ) {
            onSimulationUpdatedCallback = callback;
        },
        onSimulationStop : function ( callback ) {
            onSimulationStopCallback = callback;
        },
        updateSimulationSize : function () {
            return function () {
                width = Math.max( document.documentElement.clientWidth, window.innerWidth || 0 );
                height = Math.max( document.documentElement.clientHeight, window.innerHeight || 0 );
                camera.aspect = width / height;
                camera.updateProjectionMatrix();
                renderer.setSize( width, height );
                if ( labelsVisible ) {
                    updateLabels();
                }
            };
        },
        lookAt : lookAt,
        setLookFromOrbitsAround : function ( lookFrom ) {
            lookingFrom = lookFrom;
            controls.enableRotate = !lookingFrom;
            lookAt( targetObj );
        }
    };
} )();