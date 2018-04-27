const KM = 1;
const AU = 149597870.7 * KM; // 1 Astronomical Unit (AU) = 149597870.7 Kilometers (Km)

const J2000 = new Date( '2000-01-01T12:00:00-00:00' ).getTime(); //reference time
const SECONDS_IN_DAY = 24 * 60 * 60;
//const MILLISECONDS_IN_DAY = SECONDS_IN_DAY * 1000;
const SECONDS_IN_CENTURY = 100 * 365.25 * SECONDS_IN_DAY;

let OrbitUtils = ( function () {

    const CIRCLE_RAD = 2 * Math.PI;

    const YEAR = 365.25636; //sidereal year

    const TOL = 10e-6;

    let solveKeplerEquation = function ( e, M ) {
        let prevE = 0;
        let currentE = M;
        do {
            prevE = currentE;
            currentE = prevE + ( M - prevE + e * Math.sin( prevE ) ) / ( 1 - e * Math.cos( prevE ) );
        } while ( Math.abs( currentE - prevE ) > TOL );
        return currentE;
    };

    let calculateEccentricAnomaly = function ( e, M ) {
        if ( e === 0.0 || e === 1.0 ) {
            return M;
        } else if ( e < 1.0 ) {
            return solveKeplerEquation( e, M );
        } //for simplicity we do not consider objects with e > 1.0
    };

    return {
        getJDFromUnix : function ( unixMSecs ) {
            return ( unixMSecs / 86400000.0 ) + 2440587.5;
        },
        calculateOrbitalPeriod : function ( time, object ) {
            if ( object.orbit.hasOwnProperty( "day" ) ) {
                return ( 360 / object.orbit.day.M );
            } else {
                let T = ( time.getTime() - J2000 ) / SECONDS_IN_CENTURY;
                let orbitRadius = ( object.orbit.base.a + object.orbit.cy.a * T );
                return Math.sqrt( orbitRadius * orbitRadius * orbitRadius ) * YEAR;
            }
        },
        calculateObjectPosition : function ( time, object ) {
            let T = Math.floor( ( time.getTime() - J2000 ) / 1000 );

            if ( object.orbit.hasOwnProperty( "epoch" ) ) {
                T -= ( object.orbit.epoch - 2451545.0 ) * SECONDS_IN_DAY;
            }

            let cy = object.orbit.hasOwnProperty( "cy" ); //true if correction elements are "per century"
            let base = object.orbit.base;
            let correction;
            if ( cy ) {
                correction = object.orbit.cy;
                T /= SECONDS_IN_CENTURY;
            } else {
                correction = object.orbit.day;
                T /= SECONDS_IN_DAY;
            }

            let elements = {};
            for ( const element of Object.keys( base ) ) {
                elements[ element ] = base[ element ] + correction[ element ] * T;
            }

            elements.a *= AU;
            if ( cy ) {
                // When "per century" corrections are provided, the argument of perihelion (w) and the mean anomaly (M)
                // must be calculated; instead, if correction elements are "per day", these params are already provided!
                elements.w = ( elements.lp - elements.O );
                elements.M = ( elements.L - elements.lp );
            }

            elements.w *= THREE.Math.DEG2RAD;
            elements.M *= THREE.Math.DEG2RAD;
            elements.I *= THREE.Math.DEG2RAD;
            elements.O *= THREE.Math.DEG2RAD;

            elements.E = calculateEccentricAnomaly( elements.e, elements.M );

            elements.E %= CIRCLE_RAD;
            elements.I %= CIRCLE_RAD;
            elements.O %= CIRCLE_RAD;
            elements.w %= CIRCLE_RAD;

            let xv = elements.a * ( Math.cos( elements.E ) - elements.e );
            let yv = elements.a * ( Math.sqrt( 1.0 - elements.e * elements.e ) * Math.sin( elements.E ) );

            object.trueAnomaly = 2 * Math.atan( Math.sqrt( ( 1.0 + elements.e ) /
                                                           ( 1.0 - elements.e ) ) * Math.tan( elements.E / 2 ) );

            let x_ecl = ( Math.cos( elements.w ) * Math.cos( elements.O )
                          - Math.sin( elements.w ) * Math.sin( elements.O ) * Math.cos( elements.I ) ) * xv
                        + ( -Math.sin( elements.w ) * Math.cos( elements.O )
                            - Math.cos( elements.w ) * Math.sin( elements.O ) * Math.cos( elements.I ) ) * yv;
            let y_ecl = ( Math.cos( elements.w ) * Math.sin( elements.O )
                        + Math.sin( elements.w ) * Math.cos( elements.O ) * Math.cos( elements.I ) ) * xv
                        + ( -Math.sin( elements.w ) * Math.sin( elements.O )
                        + Math.cos( elements.w ) * Math.cos( elements.O ) * Math.cos( elements.I ) ) * yv;
            let z_ecl = ( Math.sin( elements.w ) * Math.sin( elements.I ) ) * xv
                        + ( Math.cos( elements.w ) * Math.sin( elements.I ) ) * yv;

            return new THREE.Vector3( x_ecl, z_ecl, -y_ecl );
        }
    }
} )();