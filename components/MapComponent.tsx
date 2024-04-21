import { useEffect, useRef, useState } from 'react';
import { Map, View, Overlay } from 'ol';
import { Pointer, Draw } from 'ol/interaction';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import VectorSource from 'ol/source/Vector';
import { Vector as VectorLayer } from 'ol/layer';
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style';
import { getArea, getLength } from 'ol/sphere';
import Geometry from 'ol/geom/Geometry';

const MapComponent: React.FC = () => {
  // State variables
  const [measurement, setMeasurement] = useState<string | null>(null);
  const [drawType, setDrawType] = useState<string>('Point');
  const [activeDrawType, setActiveDrawType] = useState<string>('Point');
  const [olMap, setOlMap] = useState<Map | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize OpenLayers map when component mounts
    if (!mapRef.current) return;

    // Create a new OpenLayers map instance
    const mapInstance = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
      ],
      view: new View({
        center: [0, 0],
        zoom: 2,
      }),
    });

    // Set the map instance to state
    setOlMap(mapInstance);

    // Create an overlay for pinpointing coordinates
    const pinpointOverlay = new Overlay({
      position: undefined,
      element: document.createElement('div'),
    });

    mapInstance.addOverlay(pinpointOverlay);

    // Create a pointer interaction to handle clicks on the map
    const pointerInteraction = new Pointer({
      handleDownEvent: (event) => {
        const coords = mapInstance.getEventCoordinate(event.originalEvent);
        pinpointOverlay.setPosition(coords ?? undefined);
        return true;
      },
    });

    mapInstance.addInteraction(pointerInteraction);

    // Create a vector source and layer for drawn features
    const vectorSource = new VectorSource();
    const vectorLayer = new VectorLayer({
      source: vectorSource,
    });

    mapInstance.addLayer(vectorLayer);

    let drawInteraction: Draw;

    // Function to update the draw interaction based on selected draw type
    const updateDrawInteraction = () => {
      mapInstance.removeInteraction(drawInteraction);
      
      drawInteraction = new Draw({
        source: vectorSource,
        type: drawType as any,
        style: new Style({
          fill: new Fill({
            color: 'rgba(255, 255, 255, 0.2)',
          }),
          stroke: new Stroke({
            color: '#ffcc33',
            width: 2,
          }),
          image: new CircleStyle({
            radius: 7,
            fill: new Fill({
              color: '#ffcc33',
            }),
          }),
        }),
      });

      mapInstance.addInteraction(drawInteraction);

      // Handle 'drawend' event to calculate and display measurements
      drawInteraction.on('drawend', (event) => {
        const feature = event.feature;
        const geometry: Geometry | undefined = feature.getGeometry();
        
        if (geometry) {
          if (geometry.getType() === 'Polygon') {
            const area = getArea(geometry);
            setMeasurement(`Area: ${area.toFixed(2)} square meters`);
          } else if (geometry.getType() === 'LineString') {
            const length = getLength(geometry);
            setMeasurement(`Length: ${length.toFixed(2)} meters`);
          } else if (geometry.getType() === 'Point') {
            setMeasurement('Point added');
          }
        }
      });
    };
    
    updateDrawInteraction();

    // Cleanup function to remove overlays and interactions
    return () => {
      mapInstance.removeOverlay(pinpointOverlay);
      mapInstance.removeInteraction(pointerInteraction);
      mapInstance.removeInteraction(drawInteraction);
      mapInstance.dispose();
    };
  }, [drawType]);

  // Function to handle changing the draw type
  const handleDrawTypeChange = (type: string) => {
    setDrawType(type);
    setActiveDrawType(type);
    setMeasurement(null); // Reset measurement when changing draw type
  };

  // Function to clear drawn features from the map
  const clearDrawnFeatures = () => {
    if (olMap) {
      const layers = olMap.getLayers().getArray();
      let vectorSource: VectorSource | null = null;

      for (let i = 0; i < layers.length; i++) {
        const layer = layers[i];
        if (layer instanceof VectorLayer) {
          vectorSource = layer.getSource() as VectorSource;
          break;
        }
      }

      if (vectorSource) {
        vectorSource.clear();
        setMeasurement(null);
      }
    }
  };

  // Render the component
  return (
    <div>
      <div className="header">
        <h1>Map</h1>
      </div>
      <div className="map-container">
        {/* OpenLayers map container */}
        <div ref={mapRef} style={{ width: '100%', height: '400px' }} className='mapp'></div>
        {/* Draw buttons */}
        <div className="button-container">
          <button 
            className={activeDrawType === 'Point' ? 'active-button' : ''}
            onClick={() => handleDrawTypeChange('Point')}
          >
            Draw Point
          </button>
          <button 
            className={activeDrawType === 'LineString' ? 'active-button' : ''}
            onClick={() => handleDrawTypeChange('LineString')}
          >
            Draw Line
          </button>
          <button 
            className={activeDrawType === 'Polygon' ? 'active-button' : ''}
            onClick={() => handleDrawTypeChange('Polygon')}
          >
            Draw Polygon
          </button>
          {/* Button to clear drawn features */}
          <button onClick={clearDrawnFeatures}>Clear Drawings</button>
        </div>
        {/* Measurement display */}
        {measurement && <div className="measurement">{measurement}</div>}
      </div>
    </div>
  );
};

export default MapComponent;
