
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

export default function AttackHeatmap({ attacks }) {
  return (
    <ComposableMap>
      <Geographies geography={geoUrl}>
        {({ geographies }) =>
          geographies.map((geo) => (
            <Geography key={geo.rsmKey} geography={geo} fill="#DDD" stroke="#FFF" />
          ))
        }
      </Geographies>
      {attacks.map((attack, i) => (
        <Marker key={i} coordinates={[attack.lng, attack.lat]}>
          <circle r={4} fill="#F00" />
        </Marker>
      ))}
    </ComposableMap>
  );
}
