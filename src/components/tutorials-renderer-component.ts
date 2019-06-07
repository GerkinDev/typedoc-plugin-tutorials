import { values } from 'lodash';
import { resolve } from 'path';

import { CommentTag, DeclarationReflection, SignatureReflection } from 'typedoc/dist/lib/models';
import { Component, ContextAwareRendererComponent } from 'typedoc/dist/lib/output/components';
import { PageEvent, RendererEvent } from 'typedoc/dist/lib/output/events';

import { Tutorial } from '../models/tutorial';
import { PLUGIN_NAME } from '../utils';
import { TutorialsScannerComponent } from './tutorials-scanner-component';

interface ILeveledTag {
	tag: CommentTag;
	level: number;
}
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
			[PageEvent.BEGIN]: this.onBeginPage,
		} );
	}

	protected onBeginRenderer( rendererEvent: RendererEvent ) {
		super.onBeginRenderer( rendererEvent );

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

	protected onBeginPage( pageEvent: PageEvent ) {
		super.onBeginPage( pageEvent );

		this.registerNavigations( pageEvent );
		if ( pageEvent.model instanceof DeclarationReflection ) {
			this.resolveTutorials( pageEvent.model );
		}
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

	private resolveTutorials( reflection: DeclarationReflection ) {
		const allRefsWithChildren = TutorialsRendererComponent.getAllReflectionsWithChildren( reflection );
		const allTutoTags = allRefsWithChildren
			.reduce( ( acc, ref ) => acc.concat( TutorialsRendererComponent.getTutorialTags( ref ) ), [] as ILeveledTag[] );
		allTutoTags
			.forEach( ( { tag, level } ) => {
				if ( ( tag as any ).resolved ) {
					return;
				}
				( tag as any ).resolved = true;
				tag.text = this.convertCommentTagText( tag.text, level );
			} );

	}

	private convertCommentTagText( tagText: string, level: number ): string {
		if ( !this.tutorialScanner.index ) {
			throw new Error( 'Missing scanner index page' );
		}
		tagText = tagText.trim();
		const tutoId = tagText.replace( /^(\S+).*?$/, '$1' );
		if ( !tutoId ) {
			throw new Error( `Misformatted comment "${tagText}"` );
		}
		const tutoSummary = tagText.replace( tutoId, '' ).trim();
		const tuto = this.tutorialScanner.allTutorials[`${this.tutorialScanner.index.path}/${tutoId}`];
		if ( !tuto || !( tuto instanceof Tutorial ) ) {
			// tslint:disable-next-line: no-console
			console.warn( `Missing or invalid tutorial page for id "${tutoId}"` );
			return Tutorial.makeDefaultTagLink( tutoId, level, tutoSummary );
		} else {
			return tuto.makeTagLink( tutoUrl => this.getRelativeUrl( tutoUrl ), level, tutoSummary );
		}
	}

	private static getAllReflectionsWithChildren( reflection: DeclarationReflection ): DeclarationReflection[] {
		if ( reflection.children ) {
			return reflection.children
				.reduce(
					( acc, sub ) => acc.concat( this.getAllReflectionsWithChildren( sub ) ),
					[reflection] );
		} else {
			return [ reflection ];
		}
	}

	private static getTutorialTags( reflection: DeclarationReflection | SignatureReflection, level = 4 ): ILeveledTag[] {
		const thisRefTags = reflection.comment && reflection.comment.tags ?
			// filter tag that paramName is 'tutorial'
			reflection.comment.tags.filter( tag => tag.tagName === 'tutorial' ).map( tag => ( { tag, level } ) ) :
			[];
		if ( reflection instanceof DeclarationReflection && reflection.signatures ) {
			reflection.signatures
				.forEach( signature => thisRefTags.push( ...this.getTutorialTags( signature, 5 ) ) );
		}
		return thisRefTags;
	}
}
