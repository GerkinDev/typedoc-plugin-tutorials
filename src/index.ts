import { PluginHost } from 'typedoc/dist/lib/utils';

import { TutorialsConverterComponent } from './components/tutorials-converter-component';
import { TutorialsScannerComponent } from './components/tutorials-scanner-component';
import { TutorialsRendererComponent } from './components/tutorials-renderer-component';

export = ( pluginHost: PluginHost ) => {
	const app = pluginHost.owner;

	app.addComponent( TutorialsScannerComponent.componentName, new TutorialsScannerComponent( app ) );
	app.converter.addComponent( TutorialsConverterComponent.componentName, new TutorialsConverterComponent( app.converter ) );
	app.renderer.addComponent( TutorialsRendererComponent.componentName, new TutorialsRendererComponent( app.renderer ) );
};
