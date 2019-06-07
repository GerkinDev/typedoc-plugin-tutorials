import { Converter } from 'typedoc/dist/lib/converter';
import { ConverterComponent } from 'typedoc/dist/lib/converter/components';
import { Component } from 'typedoc/dist/lib/utils';

import { PLUGIN_NAME } from '../utils';
import { TutorialsScannerComponent } from './tutorials-scanner-component';

@Component( { name: TutorialsConverterComponent.componentName } )
export class TutorialsConverterComponent extends ConverterComponent {
	public static readonly componentName = `${PLUGIN_NAME}-converter`;
	protected tutorialScanner!: TutorialsScannerComponent;

	protected initialize() {
		this.tutorialScanner = TutorialsScannerComponent.getFromApp( this.application );

		this.listenTo( this.owner, {
			[Converter.EVENT_BEGIN]: () => this.tutorialScanner.aggregateConfig(),
		} );
	}
}
