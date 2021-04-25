import _ from 'lodash';

export class OptionalArgs {
  private args: string;
  constructor(args: string) {
    this.args = args;
  }

  public get isDetail(): boolean {
    return this.checkArg('d');
  }

  public get isTarget(): boolean {
    return this.checkArg('t');
  }

  public get isNote(): boolean {
    return this.checkArg('n');
  }

  private checkArg(arg: string): boolean {
    return _.includes(this.args, arg);
  }
}
