declare module 'react-csv' {
  import * as React from 'react';
  // Loosen the types to avoid TS2786 incompatibility with React 18 typings during build
  export const CSVLink: React.ComponentType<any>;
  export const CSVDownload: React.ComponentType<any>;
}
