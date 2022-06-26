export class BuildPipes {
    private static pipes = new Map<string, (arg: unknown) => string>([
        ['LowerCasePipe', v => String(v).toLowerCase()],
        ['UpperCasePipe', v => String(v).toUpperCase()],
        ['ToFixedPipe', v => Number(v).toFixed(2)],
    ]);

    static get(name: string) {
        const pipe = BuildPipes.pipes.get(name);

        if (!pipe) {
            throw new Error(`Not found Pipe: ${pipe}`);
        }

        return pipe;
    }

    static setPipe(name: string, pipe: (arg: unknown) => never) {
      if (BuildPipes.pipes.has(name)) {
        throw new Error('Pipe already exist');
      }

      BuildPipes.pipes.set(name, pipe);
    }
}
