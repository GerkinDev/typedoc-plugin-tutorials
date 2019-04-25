import { Application } from 'typedoc/dist/lib/application';
import { AbstractComponent, Component, Option } from 'typedoc/dist/lib/utils';

import { readdirSync } from 'fs';
import { assign, cloneDeep, Dictionary, every, isEmpty, isPlainObject, isString, isUndefined, mapValues, omitBy, pick, transform, values } from 'lodash';
import { basename, extname, resolve } from 'path';
import { ParameterHint, ParameterType } from 'typedoc/dist/lib/utils/options/declaration';
import { PLUGIN_NAME } from './utils';

interface IInputDescription {
	title: string;
	children?: Dictionary<IInputDescription>;
}
interface IDescriptionResolved extends IInputDescription {
	source: string;
	dest?: string;
	parent?: IDescriptionResolved;
	children?: Dictionary<IDescriptionResolved>;
}
export interface IDescription extends IDescriptionResolved {
	canonicalName: string;
	dest: string;
	parent?: IDescription;
	children?: Dictionary<IDescription>;
}

const isTutorialsDict = ( value: any ): value is Dictionary<IInputDescription> =>
	every( values( value ), desc => isTutorialDesc( desc ) );
const isTutorialDesc = ( value: any ): value is IInputDescription =>
	isString( value.title ) && ( isUndefined( value.children ) || ( isPlainObject( value.children ) && isTutorialsDict( value.children ) ) );

@Component( { name: TutorialsIndex.componentName } )
export class TutorialsIndex extends AbstractComponent<Application> {
	public static readonly componentName = `${PLUGIN_NAME}-index`;

	public readonly indexUrl = 'tutorials/index.html';

	private tutorialsFlattened!: Dictionary<IDescription>;

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

	public get allTutorials() {
		return this.tutorialsFlattened;
	}
	public get tutorialsTree() {
		return omitBy( this.tutorialsFlattened, tutorial => tutorial.parent );
	}

	public aggregateConfig() {
		if ( !this.tutorialsDirectory ) {
			throw new Error( 'Missing required option `tutorials-directory`' );
		}
		if ( !isTutorialsDict( this.tutorialsMap ) ) {
			throw new Error( 'Invalid `tutorials` option' );
		}
		this.tutorialFiles = readdirSync( this.tutorialsDirectory );
		this.tutorialsFlattened = TutorialsIndex.flattenMergeTree( TutorialsIndex.resolveTutoDescs( this.tutorialsMap, this.tutorialFiles, this.tutorialsDirectory ) );
	}

	private static flattenMergeTree(
		descriptions: Dictionary<IDescriptionResolved>,
		flattenedTutorialsAcc: Dictionary<IDescription> = {},
		parents: string[] = [],
	): Dictionary<IDescription> {
		return transform(
			descriptions,
			( acc, desc, name ) => {
				const resolvedName = [...parents, name].join( '/' );

				if ( acc[resolvedName] ) {
					throw new Error( `Double declaration of tutorial ${resolvedName}` );
				}

				// `desc` is modified by reference, so we assume that `parent` was already casted, and `children` will.
				acc[resolvedName] = assign( desc, {
					canonicalName: resolvedName,
					children: desc.children as ( Dictionary<IDescription> | undefined ),
					dest: `tutorials/${resolvedName}/index.html`,
					parent: desc.parent as ( IDescription | undefined ),
				} );
				if ( desc.children ) {
					return this.flattenMergeTree( desc.children, acc, parents.concat( name ) );
				} else {
					return acc;
				}
			},
			flattenedTutorialsAcc,
		);
	}

	private static resolveTutoDescs(
		tutoDescs: Dictionary<IInputDescription> | undefined,
		tutoFiles: string[],
		baseTutoDir: string,
		parent?: IDescriptionResolved,
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
				parent,
				source: resolve( baseTutoDir, candidateSourceFiles[0] ),
			};
			const children = this.resolveTutoDescs( desc.children, tutoFiles, baseTutoDir, descResolved );
			if ( !isEmpty( children ) ) {
				descResolved.children = children;
			}
			return descResolved;
		} );
	}

	public static getFromApp( app: Application ): TutorialsIndex {
		const comp = app.getComponent( this.componentName );
		if ( !( comp instanceof this ) ) {
			throw new Error();
		}
		return comp;
	}
}
