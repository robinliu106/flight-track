import React, { useState, useEffect } from "react";
import DeckGL, { IconLayer } from "deck.gl";
import { StaticMap } from "react-map-gl";
import * as d3 from "d3";

import Airplane from "./plane-2.png";
import destinationPoint from "./destinationPoint";

// Set your mapbox access token here
const MAPBOX_ACCESS_TOKEN = "pk.eyJ1Ijoic3dpemVjIiwiYSI6ImNqcHdnaDR1MDB0bWozeG1tY28wcHVoM2UifQ.RxzaHH4i1_U32eiWoOc_jQ";

// Initial viewport settings
const initialViewState = {
    longitude: -122.41669,
    latitude: 37.7853,
    zoom: 5,
    pitch: 0,
    bearing: 0,
};

const App = () => {
    const [airplanes, setAirplanes] = useState([]);
    let currentFrame = null;
    let timer = null;
    const fetchEverySeconds = 10;
    const framesPerFetch = fetchEverySeconds * 30; // 60fps, 10 second intervals

    const fetchData = () => {
        d3.json("https://opensky-network.org/api/states/all").then(({ states }) =>
            setAirplanes(
                states.map((d) => ({
                    callsign: d[1],
                    longitude: d[5],
                    latitude: d[6],
                    velocity: d[9],
                    altitude: d[13],
                    origin_country: d[2],
                    true_track: -d[10],
                    interpolatePos: d3.geoInterpolate(
                        [d[5], d[6]],
                        destinationPoint(d[5], d[6], d[9] * fetchEverySeconds, d[10])
                    ),
                }))
            )
        );

        (() => {
            startAnimation();
            setTimeout(fetchData, fetchEverySeconds * 1000);
        })();
    };

    useEffect(() => {
        fetchData();
    }, []);

    const startAnimation = () => {
        if (timer) {
            timer.stop();
        }
        currentFrame = 0;
        timer = d3.timer(animationFrame);
    };

    const animationFrame = () => {
        const animatedPlanes = airplanes.map((d) => {
            const [longitude, latitude] = d.interpolatePos(currentFrame / framesPerFetch);
            return {
                ...d,
                longitude,
                latitude,
            };
        });
        currentFrame += 1;
        setAirplanes(animatedPlanes);
    };

    const layers = [
        new IconLayer({
            id: "airplanes",
            data: airplanes,
            pickable: false,
            iconAtlas: Airplane,
            iconMapping: {
                airplane: {
                    x: 0,
                    y: 0,
                    width: 512,
                    height: 512,
                },
            },
            sizeScale: 20,
            getPosition: (d) => [d.longitude, d.latitude],
            getIcon: (d) => "airplane",
            getAngle: (d) => 45 + (d.true_track * 180) / Math.PI,
        }),
    ];

    return (
        <DeckGL initialViewState={initialViewState} controller={true} layers={layers}>
            <StaticMap mapboxApiAccessToken={MAPBOX_ACCESS_TOKEN} />
        </DeckGL>
    );
};

export default App;
