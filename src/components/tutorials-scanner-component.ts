import { readdirSync } from 'fs';
import { Dictionary, every, isEmpty, isPlainObject, isString, isUndefined, mapValues, transform, values } from 'lodash';
import { basename, extname, resolve } from 'path';

import { Application } from 'typedoc/dist/lib/application';
import { AbstractComponent, Component, Option } from 'typedoc/dist/lib/utils';
import { ParameterHint, ParameterType } from 'typedoc/dist/lib/utils/options/declaration';

import { IPage } from '../models/i-page';
import { PLUGIN_NAME } from '../utils';
import { TutorialIndex } from './../models/tutorial-index';

interface IInputDescription {
	title: string;
	description?: string;
	children?: Dictionary<IInputDescription>;
}
export interface IDescriptionResolved extends IInputDescription {
	source: string;
	children?: Dictionary<IDescriptionResolved>;
}

const isTutorialsDict = ( value: any ): value is Dictionary<IInputDescription> =>
	every( values( value ), desc => isTutorialDesc( desc ) );
const isTutorialDesc = ( value: any ): value is IInputDescription =>
	isString( value.title ) &&
	( isString( value.description ) || isUndefined( value.description ) ) &&
	( isUndefined( value.children ) || ( isPlainObject( value.children ) && isTutorialsDict( value.children ) ) );

@Component( { name: TutorialsScannerComponent.componentName } )
export class TutorialsScannerComponent extends AbstractComponent<Application> {
	public static readonly componentName = `${PLUGIN_NAME}-scanner`;

	private tutorialsFlattened!: Dictionary<IPage>;

	private tutorialFiles!: string[];

	@Option( {
		help: 'Tutorial Plugin: The path to a file containing the description of tutorials. See TODO for more infos on tutorials description',
		name: 'tutorials-map',
		short: 'tuto-map',

		convert: file => require( resolve( file as any ) ),
		hint: ParameterHint.File,
		// defaultValue: {} as Dictionary<IDescription>,
		// type: ParameterType.Mixed,
	} )
	private readonly tutorialsMap!: unknown;

	@Option( {
		help: 'Tutorial Plugin: The base directory of tutorials',
		name: 'tutorials-directory',
		short: 'tuto-dir',

		hint: ParameterHint.Directory,
		type: ParameterType.String,
	} )
	private readonly tutorialsDirectory!: string;

	private _index?: TutorialIndex;
	public get index() {
		return this._index;
	}

	public get allTutorials() {
		return this.tutorialsFlattened;
	}

	public aggregateConfig() {
		if ( !this.tutorialsDirectory ) {
			throw new Error( 'Missing required option `tutorials-directory`' );
		}
		if ( !isTutorialsDict( this.tutorialsMap ) ) {
			throw new Error( 'Invalid `tutorials` option' );
		}
		this.tutorialFiles = readdirSync( this.tutorialsDirectory );
		const tutoDescsResolved = TutorialsScannerComponent.resolveTutoDescs( this.tutorialsMap, this.tutorialFiles, this.tutorialsDirectory );
		this._index = new TutorialIndex( tutoDescsResolved, this.application );
		this.tutorialsFlattened = this.flattenTree();
	}

	private flattenTree() {
		if ( !this._index ) {
			throw new Error();
		}
		return TutorialsScannerComponent.flattenTreeRec( this._index, {} );
	}

	private static flattenTreeRec(
		page: IPage,
		acc: Dictionary<IPage>,
	): Dictionary<IPage> {
		return transform(
			page.getChildren(),
			( subAcc, subPage ) => {
				subAcc[subPage.key] = subPage;

				if ( subPage.hasChildren() ) {
					return this.flattenTreeRec( subPage, subAcc );
				} else {
					return subAcc;
				}
			},
			acc,
		);
	}

	private static resolveTutoDescs(
		tutoDescs: Dictionary<IInputDescription> | undefined,
		tutoFiles: string[],
		baseTutoDir: string,
	): Dictionary<IDescriptionResolved> {
		return mapValues( tutoDescs, ( desc, name ) => {
			const candidateSourceFiles = tutoFiles.filter( tutoFile => tutoFile === name ||
				basename( tutoFile ) === name ||
				basename( tutoFile, extname( tutoFile ) ) === name ||
				tutoFile === basename( name ) ||
				basename( tutoFile ) === basename( name ) ||
				basename( tutoFile, extname( tutoFile ) ) === basename( name ) );
			if ( candidateSourceFiles.length > 1 ) {
				throw new Error( `Multiple files matching "${name}": ${JSON.stringify( candidateSourceFiles )}` );
			} else if ( candidateSourceFiles.length === 0 ) {
				throw new Error( `No files matching "${name}" in ${JSON.stringify( tutoFiles )}` );
			}

			const descResolved: IDescriptionResolved = {
				...desc,

				children: undefined,
				source: resolve( baseTutoDir, candidateSourceFiles[0] ),
			};
			const children = this.resolveTutoDescs( desc.children, tutoFiles, baseTutoDir );
			if ( !isEmpty( children ) ) {
				descResolved.children = children;
			}
			return descResolved;
		} );
	}

	public static getFromApp( app: Application ): TutorialsScannerComponent {
		const comp = app.getComponent( this.componentName );
		if ( !( comp instanceof this ) ) {
			throw new Error();
		}
		return comp;
	}
}
