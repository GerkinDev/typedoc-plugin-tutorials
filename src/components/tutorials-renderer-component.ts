import { Component, ContextAwareRendererComponent } from 'typedoc/dist/lib/output/components';
import { PageEvent, RendererEvent } from 'typedoc/dist/lib/output/events';

import { values } from 'lodash';
import { resolve } from 'path';

import { PLUGIN_NAME } from '../utils';
import { TutorialsScannerComponent } from './tutorials-scanner-component';

@Component( { name: TutorialsRendererComponent.componentName } )
export class TutorialsRendererComponent extends ContextAwareRendererComponent {
	public static readonly componentName = `${PLUGIN_NAME}-renderer`;
	protected tutorialScanner!: TutorialsScannerComponent;

	protected get tutorialIndex() {
		if ( !this.tutorialScanner || !this.tutorialScanner.index ) {
			throw new Error( 'Index not correctly initialized' );
		}
		return this.tutorialScanner.index;
	}

	protected initialize() {
		this.tutorialScanner = TutorialsScannerComponent.getFromApp( this.application );

		this.listenTo( this.owner, {
			[RendererEvent.BEGIN]: this.onBeginRenderer,
			[PageEvent.BEGIN]: this.registerNavigations,
		} );
	}

	protected onBeginRenderer( rendererEvent: RendererEvent ) {
		this.extendTheme();

		this.registerUrlMappings( rendererEvent );
	}

	private extendTheme() {
		if ( !this.owner.theme ) {
			throw new Error( "Can't extend theme" );
		}
		this.owner.theme.resources.deactivate();
		this.owner.theme.resources.addDirectory( 'tutorials', resolve( __dirname, '../../views' ) );
		this.owner.theme.resources.activate();
	}

	private registerUrlMappings( rendererEvent: RendererEvent ) {
		if ( !rendererEvent.urls ) {
			throw new Error( "Can't append to urls" );
		}
		const tutoPages = values( this.tutorialScanner.allTutorials ).map( tutorial => tutorial.urlMapping );

		rendererEvent.urls.push( this.tutorialIndex.urlMapping, ...tutoPages );
	}

	private registerNavigations( pageEvent: PageEvent ) {
		if ( pageEvent.navigation ) {
			if ( !pageEvent.navigation!.children ) {
				pageEvent.navigation!.children = [];
			}
			const nav = pageEvent.navigation.children.find( c => c.url === this.tutorialIndex.url );
			if ( !nav ) {
				pageEvent.navigation!.children.push( this.tutorialIndex.getNavigationItem( pageEvent ) );
			} else {
				nav.isVisible = true;
			}
		}
	}
}
