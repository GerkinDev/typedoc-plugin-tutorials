import { Context, Converter } from 'typedoc/dist/lib/converter';
import { ConverterComponent } from 'typedoc/dist/lib/converter/components';
import { Comment, CommentTag } from 'typedoc/dist/lib/models';
import { Component } from 'typedoc/dist/lib/utils';

import { extname } from 'path';

import { ContextAwareRendererComponent } from 'typedoc/dist/lib/output/components';
import { Tutorial } from '../models/tutorial';
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
			[Converter.EVENT_RESOLVE_BEGIN]: this.onResolveBegin,
		} );
	}

	private onResolveBegin( context: Context ) {
		TutorialsConverterComponent
			.getTutorialTags( context )
			.forEach( tag => tag.text = this.convertCommentTagText( tag.text ) );
	}

	private convertCommentTagText( tagText: string ): string {
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
			console.warn( `Missing or invalid tutorial page for id "${tutoId}"` );
			return Tutorial.makeDefaultTagLink( tutoId, tutoSummary );
		} else {
			return tuto.makeTagLink( tutoSummary );
		}
	}

	private static getTutorialTags( context: Context ): CommentTag[] {
		return Object
			// get reflection from context
			.values( context.project.reflections )

			// get Comment from Reflection
			.map( reflection => reflection.comment )

			// filter only comment exist
			.filter( this.filterComment )

			// get CommentTag[] from Comment
			.map( comment => comment.tags )

			// filter only CommentTags exist
			.filter( this.filterCommentTags )

			// merge all CommentTags
			.reduce( ( a, b ) => a.concat( b ), [] )

			// filter tag that paramName is 'tutorial'
			.filter( this.isTutorialCommentTag );
	}

	private static filterComment( comment: undefined | Comment ): comment is Comment {
		return comment !== undefined && !!comment;
	}

	private static filterCommentTags( tags: CommentTag[] | undefined ): tags is CommentTag[] {
		return tags !== undefined && !!tags;
	}

	private static isTutorialCommentTag( tag: CommentTag ): boolean {
		return tag.tagName === 'tutorial';
	}
}
