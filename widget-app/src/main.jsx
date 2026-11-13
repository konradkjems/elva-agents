import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter/wght.css';
import './styles/app.css';
import { App } from './widget/App';

createRoot(document.getElementById('root')).render(<App />);
