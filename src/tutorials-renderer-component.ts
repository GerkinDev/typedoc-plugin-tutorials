import { Component, ContextAwareRendererComponent, RendererComponent } from 'typedoc/dist/lib/output/components';
import { PageEvent, RendererEvent } from 'typedoc/dist/lib/output/events';
import { NavigationItem } from 'typedoc/dist/lib/output/models/NavigationItem';
import { UrlMapping } from 'typedoc/dist/lib/output/models/UrlMapping';
import { Renderer } from 'typedoc/dist/lib/output/renderer';
import { DUMMY_APPLICATION_OWNER } from 'typedoc/dist/lib/utils/component';

import { Dictionary, forEach, isEmpty, keys, mapValues, pick, some, values } from 'lodash';
import { join, resolve } from 'path';
import { inspect } from 'util';

import { readFileSync } from 'fs';
import { IDescription, TutorialsIndex } from './tutorials-index';
import { PLUGIN_NAME } from './utils';

@Component( { name: TutorialRendererComponent.componentName } )
export class TutorialRendererComponent extends RendererComponent {
	public static readonly componentName = `${PLUGIN_NAME}-renderer`;
	protected tutorialIndex!: TutorialsIndex;

	protected initialize() {
		this.tutorialIndex = TutorialsIndex.getFromApp( this.application );

		this.listenTo( this.owner, {
			[RendererEvent.BEGIN]: this.onBeginRenderer,
			[PageEvent.BEGIN]: this.onBeginPage,
		} );
	}

	private onBeginRenderer( rendererEvent: RendererEvent ) {
		this.extendTheme();

		this.registerPages( rendererEvent );
	}

	private extendTheme() {
		if ( !this.owner.theme ) {
			throw new Error( "Can't extend theme" );
		}
		this.owner.theme.resources.deactivate();
		this.owner.theme.resources.addDirectory( 'tutorials', resolve( __dirname, '../views' ) );
		this.owner.theme.resources.activate();
	}

	private registerPages( rendererEvent: RendererEvent ) {
		if ( !rendererEvent.urls ) {
			throw new Error( "Can't append to urls" );
		}

		const tutoIndex = new UrlMapping( this.tutorialIndex.indexUrl, {
			name: 'Tutorial index',
			intro: 'Welcome to the tutorials index.',
			tutorials: Object.values( this.tutorialIndex.tutorialsTree ),
		},                                'tutorial-index.hbs' );
		const tutoPages = values( mapValues( this.tutorialIndex.allTutorials, ( tutorial, identifier ) =>
			new UrlMapping( tutorial.dest, {
				name: `Tutorial: ${tutorial.title}`,
				readme: this.getTutorialContent( tutorial ),
			},              'index.hbs' ) ) );

		rendererEvent.urls.push( tutoIndex, ...tutoPages );
	}

	private getTutorialContent( tutorial: IDescription ) {
		const tutoContent = readFileSync( tutorial.source, 'utf-8' );
		if ( tutorial.children && !isEmpty( tutorial.children ) ) {
			const renderer = ( this.application.getComponent( 'marked-link' ) as ContextAwareRendererComponent | undefined );
			const tutoLinks = values( tutorial.children )
				.map( subTuto => ` * [${subTuto.title}](${renderer ? renderer.getRelativeUrl( subTuto.dest ) : '#'})` )
				.join( '\n' );
			return `${tutoContent}\n\n-----\n\n${tutoLinks}`;
		}
		return tutoContent;
	}

	private onBeginPage( pageEvent: PageEvent ) {
		if (
			pageEvent.navigation &&
			( ( !pageEvent.navigation.children ) ||
			!( pageEvent.navigation.children.some( c => c.url === this.tutorialIndex.indexUrl ) ) )// || true
		) {
			const rootTutorialsNavItem = new NavigationItem( 'Tutorials & guides', this.tutorialIndex.indexUrl );
			rootTutorialsNavItem.isVisible = true;
			TutorialRendererComponent.makeSubNavigationItems( this.tutorialIndex.tutorialsTree, rootTutorialsNavItem );
			if ( !pageEvent.navigation!.children ) {
				pageEvent.navigation!.children = [];
			}
			pageEvent.navigation!.children.push( rootTutorialsNavItem );
		}
	}

	private static makeSubNavigationItems( subItems: Dictionary<IDescription>, parent: NavigationItem ) {
		forEach( subItems, tutorial => {
			const subNav = new NavigationItem( tutorial.title, tutorial.dest, parent );
			subNav.isVisible = true;
			if ( tutorial.children ) {
				this.makeSubNavigationItems( tutorial.children, subNav );
			}
		} );
	}
}
