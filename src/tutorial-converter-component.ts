import { Context, Converter } from 'typedoc/dist/lib/converter';
import { ConverterComponent } from 'typedoc/dist/lib/converter/components';
import { Comment, CommentTag } from 'typedoc/dist/lib/models';
import { Component } from 'typedoc/dist/lib/utils';

import { extname } from 'path';

import { ContextAwareRendererComponent } from 'typedoc/dist/lib/output/components';
import { TutorialsIndex } from './tutorials-index';
import { PLUGIN_NAME } from './utils';


@Component( { name: TutorialConverterComponent.componentName } )
export class TutorialConverterComponent extends ConverterComponent {
	public static readonly componentName = `${PLUGIN_NAME}-converter`;
	protected tutorialIndex!: TutorialsIndex;

	protected initialize() {
		this.tutorialIndex = TutorialsIndex.getFromApp( this.application );

		this.listenTo( this.owner, {
			[Converter.EVENT_BEGIN]: () => this.tutorialIndex.aggregateConfig(),
			[Converter.EVENT_RESOLVE_BEGIN]: this.onResolveBegin,
		} );
	}

	private onResolveBegin( context: Context ) {
		TutorialConverterComponent
			.getTutorialTags( context )
			.forEach( tag => tag.text = this.convertCommentTagText( tag.text ) );
	}

	private convertCommentTagText( tagText: string ): string {
		tagText = tagText.trim();
		const tutoId = tagText.replace( /^(\S+).*?$/, '$1' );
		if ( !tutoId ) {
			throw new Error( `Misformatted comment "${tagText}"` );
		}
		const tutoSummary = tagText.replace( tutoId, '' ).trim();
		const tutoDesc = this.tutorialIndex.allTutorials[tutoId];
		if ( !tutoDesc ) {
			console.warn( `Missing tutorial for tuto id "${tutoId}"` );
		}

		// Get a context-aware component, to resolve URLs
		const renderer = ( this.owner.getComponent( 'marked-link' ) as ContextAwareRendererComponent | undefined );
		const tutoLink = tutoDesc && renderer ?
			// TODO URL resolve
			`<h4 style="display:inline-block;"><a href="${ renderer.getRelativeUrl( tutoDesc.dest ) }${extname( tutoDesc.source )}">${tutoDesc.title}</a></h4>` :
			`<h4 style="display:inline-block;">Missing tutorial <code>${tutoId}</code></h4>`;

		if ( tutoSummary ) {
			return `<details open><summary>${tutoLink}</summary>${tutoSummary}</details>`;
		} else {
			return tutoLink;
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
