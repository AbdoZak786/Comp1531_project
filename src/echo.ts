// Do not delete this file before iteration 3
function echo(value: any) {
  if (value.echo && value.echo === 'echo') {
    // Return a descriptive error message for easy debugging
    return { error: 'Cannot echo an object with the property \'echo\'.' };
  }
  return value;
}

export { echo };
