import { PluginHost } from 'typedoc/dist/lib/utils';

import { TutorialConverterComponent } from './tutorial-converter-component';
import { TutorialsIndex } from './tutorials-index';
import { TutorialRendererComponent } from './tutorials-renderer-component';

export = ( pluginHost: PluginHost ) => {
	const app = pluginHost.owner;

	app.addComponent( TutorialsIndex.componentName, new TutorialsIndex( app ) );
	app.converter.addComponent( TutorialConverterComponent.componentName, new TutorialConverterComponent( app.converter ) );
	app.renderer.addComponent( TutorialRendererComponent.componentName, new TutorialRendererComponent( app.renderer ) );
};
