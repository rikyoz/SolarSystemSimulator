const TIME_SCALE = [ 1, 60, 3600, 24 * 3600, 7 * 24 * 3600, 30 * 24 * 3600, 90 * 24 * 3600, 180 * 24 * 3600,
                     365 * 24 * 3600 ];
const TIME_SCALE_LABEL = [ "1 sec.", "1 min.", "1 hour", "1 day", "1 week", "~1 month", "~3 months", "~6 months",
                           "~1 year" ];

function pad( n ) {
    return n < 10 ? '0' + n : n;
}

function formatDateTime( datetime ) {
    let tz = datetime.getTimezoneOffset();
    let tzSign = tz > 0 ? "-" : "+";
    let tzHours = pad( Math.floor( Math.abs( tz ) / 60 ) );
    let tzMinutes = pad( Math.abs( tz ) % 60 );
    return {
        iso_date : datetime.getFullYear() + "-" + pad( datetime.getMonth() + 1 ) + "-" + pad( datetime.getDate() ),
        time : pad( datetime.getHours() ) + ":" + pad( datetime.getMinutes() ) + ":" + pad( datetime.getSeconds() ),
        toString : function () {
            return pad( datetime.getDate() ) + "/" + pad( datetime.getMonth() + 1 ) + "/" + datetime.getFullYear() +
                " - " + this.time + " (UTC" + tzSign + tzHours + ":" + tzMinutes + ")";
        }
    };
}

const UI = {
    initialize : function ( solar_system, minYear, maxYear ) {
        let date = new Date();
        let datetime = formatDateTime( date );

        let simulationButton = $( "#simulation-btn" );
        simulationButton.click( function () {
            simulationButton.find( "a" ).toggleClass( "fa-play fa-pause" );
            let is_simulating = simulationButton.find( "a" ).hasClass( "fa-pause" );
            simulationButton.find( ".tooltip" ).html( is_simulating ? "Pause" : "Play" );
            if ( is_simulating ) {
                Simulator.startSimulation( date );
            } else {
                Simulator.stopSimulation();
            }
        } );

        let datePicker = $( "#date-picker" );
        let timePicker = $( "#time-picker" );
        datePicker[ 0 ].value = datetime.iso_date;
        timePicker[ 0 ].value = datetime.time;
        $( "#current-datetime" ).html( datetime.toString() );

        datePicker.keypress( function ( e ) {
            if ( e.which === 13 ) {
                $( "#set-datetime-btn" ).click();
            }
        } );

        timePicker.keypress( function ( e ) {
            if ( e.which === 13 ) {
                $( "#set-datetime-btn" ).click();
            }
        } );

        let simulationSpeedRange = $( "#simulation-speed" );
        simulationSpeedRange.change( function () {
            const value = $( this ).val();
            Simulator.setSimulationSpeed( TIME_SCALE[ parseInt( value ) - 1 ], parseInt( value ) );
            $( "#time-scale-label" ).html( TIME_SCALE_LABEL[ parseInt( value ) - 1 ] );
        } );
        simulationSpeedRange.on( 'input', function () {
            $( this ).trigger( 'change' );
        } );
        simulationSpeedRange.change();

        $( "#set-datetime-btn" ).click( function () {
            date = new Date( $( "#date-picker" )[ 0 ].value + " " + $( "#time-picker" )[ 0 ].value );
            if ( date.getFullYear() >= minYear && date.getFullYear() <= maxYear ) {
                Simulator.setSimulationDate( date );
            } else {
                alert( "Year is not in the range [" + minYear + ", " + maxYear + "]" );
            }
        } );

        $( "#current-datetime-btn" ).click( function () {
            date = new Date();
            datetime = formatDateTime( date );
            $( "#date-picker" )[ 0 ].value = datetime.iso_date;
            $( "#time-picker" )[ 0 ].value = datetime.time;
            Simulator.setSimulationDate( date );
        } );

        Simulator.onSimulationUpdated( function ( sim_datetime ) {
            date = sim_datetime;
            datetime = formatDateTime( sim_datetime );
            //console.log( datetime );
            $( "#current-datetime" ).html(
                datetime.toString()
            );
        } );

        Simulator.onSimulationStop( function( message )  {
            simulationButton.find( "a" ).toggleClass( "fa-play fa-pause" );
            let is_simulating = simulationButton.find( "a" ).hasClass( "fa-pause" );
            simulationButton.find( ".tooltip" ).html( is_simulating ? "Pause" : "Play" );
            alert( message );
        } );

        const INNER_SOLAR_SYSTEM = [ solar_system.mercury, solar_system.venus, solar_system.earth,
                                     solar_system.moon, solar_system.mars ];
        const OUTER_SOLAR_SYSTEM = [ solar_system.jupiter, solar_system.saturn, solar_system.uranus,
                                     solar_system.neptune ];
        const DWARF_PLANETS = [ solar_system.ceres, solar_system.pluto, solar_system.haumea, solar_system.makemake,
                                solar_system.eris ];

        const INITIALLY_HIDDEN = [ solar_system.hubble, solar_system.tesla ];

        const LOOK_AT = {
            inner_system : new THREE.Vector3( 0, 1.67 * AU * 0.25, 1.67 * AU * 2 ),
            entire_system : new THREE.Vector3( 0, 12.5 * AU, 60 * AU )
        };

        window.addEventListener( 'resize', Simulator.updateSimulationSize(), false );
        Simulator.lookAt( solar_system.sun, LOOK_AT.inner_system );

        let lookAtMenu = $( '#look-at' );
        for ( let object of Object.values( solar_system ) ) {
            if ( object instanceof SolarSysObj ) {
                let option_element = new Option( object.name, object.name.toLowerCase() );
                if ( object instanceof OrbitingObj ) {
                    option_element.setAttribute( "style", "color: #" + object.color.getHexString() );
                }
                lookAtMenu.append( option_element );
            }
        }

        function toggle_lookAt_options( objects ) {
            for ( let object of objects ) {
                lookAtMenu.children( 'option[value="' + object.name.toLowerCase() + '"]' ).toggle();
            }
        }

        for ( let object of Object.values( INITIALLY_HIDDEN ) ) {
            object.setVisible( false );
        }
        toggle_lookAt_options( INITIALLY_HIDDEN );

        $( '#inner-planets' ).change( function () {
            Simulator.setObjectsVisibility( INNER_SOLAR_SYSTEM, this.checked );
            $( '#moon' ).prop( 'checked', this.checked );
            toggle_lookAt_options( INNER_SOLAR_SYSTEM );
        } );

        $( '#asteroid-belt' ).change( function () {
            Simulator.setObjectsVisibility( [ solar_system.asteroid_belt ], this.checked );
        } );

        $( '#outer-planets' ).change( function () {
            Simulator.setObjectsVisibility( OUTER_SOLAR_SYSTEM, this.checked );
            toggle_lookAt_options( OUTER_SOLAR_SYSTEM );
        } );

        $( '#dwarf-planets' ).change( function () {
            Simulator.setObjectsVisibility( DWARF_PLANETS, this.checked );
            toggle_lookAt_options( DWARF_PLANETS );
        } );

        $( '#stars' ).change( function () {
            Simulator.setStarsVisibility( this.checked );
        } );

        $( '#moon' ).change( function () {
            Simulator.setObjectsVisibility( [ solar_system.moon ], this.checked );
            toggle_lookAt_options( [ solar_system.moon ] );
        } );

        $( '#hubble' ).change( function () {
            Simulator.setObjectsVisibility( [ solar_system.hubble ], this.checked );
            toggle_lookAt_options( [ solar_system.hubble ] );
        } );

        $( '#tesla' ).change( function () {
            Simulator.setObjectsVisibility( [ solar_system.tesla ], this.checked );
            toggle_lookAt_options( [ solar_system.tesla ] );
        } );

        $( '#orbits' ).change( function () {
            Simulator.setOrbitsVisibility( solar_system, this.checked );
        } );

        $( '#labels' ).change( function () {
            Simulator.setLabelsVisibility( solar_system, this.checked );
        } );

        $( '#stats' ).change( function () {
            Simulator.setStatsVisibility( this.checked );
        } );

        $( '#habitable' ).change( function () {
            Simulator.setHabitableZoneVisibility( this.checked && !this.disabled );
        } );

        $( '#debug' ).change( function () {
            Simulator.setDebugVisibility( solar_system, this.checked );
        } );

        $( '#enable-look-from' ).change( function () {
            Simulator.setLookFromOrbitsAround( this.checked );
            $( '#follow-target' ).prop( "disabled", this.checked );
        } );

        $( '#follow-target' ).change( function () {
            Simulator.setFollowTarget( this.checked );
        } );

        lookAtMenu.change( function () {
            let value = $( this ).val();
            let object;
            let from = null;
            if ( LOOK_AT.hasOwnProperty( value ) ) {
                object = solar_system.sun;
                from = LOOK_AT[ value ];
                $( '#inner-planets' ).prop( "disabled", false );
                $( '#outer-planets' ).prop( "disabled", false );
                $( '#dwarf-planets' ).prop( "disabled", false );
                $( '#moon' ).prop( "disabled", false );
                $( '#hubble' ).prop( "disabled", false );
                $( '#tesla' ).prop( "disabled", false );
                $( '#habitable' ).prop( "disabled", false ).change();
                $( '#follow-target-label' ).hide();
                $( "#look-from-label" ).hide();
                $( '#enable-look-from' ).prop( 'checked', false ).change();
            } else { //target is a single object, we must disallow hiding it!
                object = solar_system[ value ];
                $( '#inner-planets' ).prop( "disabled", $.inArray( object, INNER_SOLAR_SYSTEM ) !== -1 );
                $( '#outer-planets' ).prop( "disabled", $.inArray( object, OUTER_SOLAR_SYSTEM ) !== -1 );
                $( '#dwarf-planets' ).prop( "disabled", $.inArray( object, DWARF_PLANETS ) !== -1 );
                $( '#moon' ).prop( "disabled", object === solar_system.moon );
                $( '#hubble' ).prop( "disabled", object === solar_system.hubble );
                $( '#tesla' ).prop( "disabled", object === solar_system.tesla );
                $( '#habitable' ).prop( "disabled", true ).change();
                $( '#follow-target-label' ).toggle( object !== solar_system.sun );
                $( '#enable-look-from' ).prop( 'checked', false ).change();
                let canLookFrom = ( object.orbitsAround !== null ) && ( object.orbitsAround !== solar_system.sun );
                $( "#look-from-label" ).toggle( canLookFrom );
                if ( canLookFrom ) {
                    $( '#look-from' ).html( object.orbitsAround.name );
                }
            }
            Simulator.lookAt( object, from );
        } );

        let scaleRange = $( "#scale-range" );
        scaleRange.val( DEFAULT_SIZE_SCALE ); //The initial scale value is taken from the constant in SolarSysUtils.js
        scaleRange.change( function () {
            const value = $( this ).val();
            $( "#scale-value" ).html( value + "x" );
            Simulator.setObjectsScale( solar_system, parseInt( value ) );
        } );
        scaleRange.on( 'input', function () {
            $( this ).trigger( 'change' );
        } );
        scaleRange.change();

        let datetimeBtn = $( "#datetime-btn" );
        datetimeBtn.click( function () {
            let datetime_settings = $( "#datetime-settings" );
            datetime_settings.slideToggle( "slow", function () {
                let is_menu_opened = ( datetime_settings.css( "display" ) !== 'none' );
                datetimeBtn.find( "a" ).toggleClass( "fa-calendar-alt fa-times" );
                datetimeBtn.find( ".tooltip" ).html( is_menu_opened ? "Close settings" : "Simulation settings" );
            } );
        } );

        let settingsBtn = $( "#settings-btn" );
        settingsBtn.click( function () {
            let settings_menu = $( "#settings-menu" );
            settings_menu.slideToggle( "slow", function () {
                let is_menu_opened = ( settings_menu.css( "display" ) !== 'none' );
                settingsBtn.find( "a" ).toggleClass( "fa-cog fa-times" );
                settingsBtn.find( ".tooltip" ).html( is_menu_opened ? "Close settings" : "Settings" );
            } );
        } );
    }
};