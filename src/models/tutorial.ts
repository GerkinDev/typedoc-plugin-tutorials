import { readFileSync } from 'fs';
import { encode } from 'he';
import { assign } from 'lodash';
import { dirname, relative } from 'path';

import { Application } from 'typedoc/dist/lib/application';

import { IDescriptionResolved } from '../components/tutorials-scanner-component';
import { APage } from './a-page';
import { IPage } from './i-page';

export class Tutorial extends APage {
	public readonly source: string;
	public readonly description?: string;

	public constructor( config: IDescriptionResolved, public readonly parent: IPage, relativeName: string, app: Application ) {
		super(
			config.title,
			[ parent.path, ...( config.children ? [relativeName, 'index.html'] : [`${relativeName}.html`] ) ].join( '/' ),
			'index.hbs',
			app,
			parent,
			( _page, nav ) => assign( nav, { isVisible: true } ) );
		this.source = config.source;
		this.description = config.description;

		if ( config.children ) {
			Object.entries( config.children )
				.forEach( ( [subName, subConf] ) => new Tutorial( subConf, this, subName, app ) );
		}
	}

	public static makeDefaultTagLink( id: string, hTagLevel: number, summary?: string ) {
		const head = `Missing tutorial <code>${id}</code>`;

		return Tutorial.generateFinalReferenceHtml( head, hTagLevel, summary );
	}

	private static generateFinalReferenceHtml( headText: string, hTagLevel: number, summary?: string ) {
		headText = `<h${hTagLevel} style="display:inline-block;">${headText}</h${hTagLevel}>`;
		return summary ? `<details open><summary>${headText}</summary>${summary}</details>` : headText;
	}

	public makeTagLink( urlResolver: ( target: string ) => string, hTagLevel: number, summary?: string ) {
		let tutoLink: string;
		try {
			tutoLink = `<a href="${ urlResolver( this.url ) }">${this.title}</a>`;
		} catch ( e ) {
			// tslint:disable-next-line: no-console
			console.warn( 'Error during link generation', e );
			tutoLink = `Unresolvable tutorial <code>${this.title}</code>`;
		}

		return Tutorial.generateFinalReferenceHtml( tutoLink, hTagLevel, summary );
	}

	protected generateModel() {
		const content = readFileSync( this.source, 'utf-8' );

		const subMenu = this.hasChildren() ? Object.values( this.getChildren() )
				.map( subTuto => ` * [${subTuto.title}](#)` )
				.join( '\n' ) : false;

		const fullContent = subMenu ?
			`${content}\n\n-----\n\n${subMenu}` :
			content;

		return {
			readme: fullContent.replace( /{{relativeURLToRoot (.*?)}}/g, ( _f, url: string ) => {
				try {
					return relative( dirname( this.url ), url.replace( /^\//, '' ) ).replace( /\\/g, '/' );
				} catch ( e ) {
					// tslint:disable-next-line: no-console
					console.warn( 'Tutorial relative URL to root resolution failed:', e );
					return `javascript:void ${encode( `"${url}"`, { useNamedReferences: true, allowUnsafeSymbols: false } )}`;
				}
			} ),
		};
	}
}
